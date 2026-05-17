from app.services.pipeline_service import PipelineService


def simulate(code: str, **kwargs):
    return PipelineService().simulate(code, forwarding=True, **kwargs)


def cycle_events(result, event_type: str | None = None):
    events = [
        event
        for cycle in result["cycles"]
        for event in cycle.get("cycleEvents", [])
    ]
    if event_type:
        return [event for event in events if event["type"] == event_type]
    return events


def events_for_text(result, instruction_text: str, event_type: str | None = None):
    return [
        event
        for event in cycle_events(result, event_type)
        if event.get("instructionText") == instruction_text
    ]


def cycles_with_instruction(result, instruction_text: str):
    return [
        cycle
        for cycle in result["cycles"]
        if any(item["source"] == instruction_text for item in cycle["instructions"])
    ]


def test_r_format_does_not_use_data_memory_but_writes_back():
    result = simulate("add $s0, $t0, $t1")

    assert not cycle_events(result, "memory_read")
    assert not cycle_events(result, "memory_write")
    assert all("DataMemory" not in cycle["activeComponents"] for cycle in result["cycles"])
    assert events_for_text(result, "add $s0, $t0, $t1", "write_back")


def test_sw_has_memory_write_but_no_write_back_stage_or_regwrite_event():
    result = simulate("add $s0, $t0, $t1\nsw $s0, 4($sp)")

    sw_text = "sw $s0, 4($sp)"
    assert events_for_text(result, sw_text, "memory_write")
    assert not events_for_text(result, sw_text, "write_back")
    assert not any(
        item["source"] == sw_text and item["stage"] == "WB"
        for cycle in result["cycles"]
        for item in cycle["instructions"]
    )
    memory_write = events_for_text(result, sw_text, "memory_write")[0]
    assert "WriteBack" not in memory_write["componentIds"]
    assert memory_write["signalValues"].get("RegWrite", 0) == 0


def test_lw_uses_data_memory_in_mem_and_writeback_in_wb():
    result = simulate(
        "lw $s0, 0($t0)",
        initial_registers={"$t0": 100},
        initial_memory={"100": 23},
    )

    read = events_for_text(result, "lw $s0, 0($t0)", "memory_read")
    wb = events_for_text(result, "lw $s0, 0($t0)", "write_back")
    assert len(read) == 1
    assert read[0]["stage"] == "MEM"
    assert "DataMemory" in read[0]["componentIds"]
    assert len(wb) == 1
    assert wb[0]["stage"] == "WB"
    assert "WriteBack" in wb[0]["componentIds"]


def test_beq_uses_branch_logic_without_memory_or_writeback():
    result = simulate("beq $s0, $s1, target\ntarget:\nadd $s2, $s3, $s4")

    beq_text = "beq $s0, $s1, target"
    branch = events_for_text(result, beq_text, "branch")
    assert branch
    assert "BranchLogic" in branch[0]["componentIds"]
    assert not events_for_text(result, beq_text, "memory_read")
    assert not events_for_text(result, beq_text, "memory_write")
    assert not events_for_text(result, beq_text, "write_back")
    assert all("DataMemory" not in cycle["activeComponents"] for cycle in cycles_with_instruction(result, beq_text))


def test_jump_updates_pipeline_pc_and_skips_unreached_instruction():
    result = simulate(
        "j end\nadd $t0, $t1, $t2\nend:\nsub $s0, $s1, $s2",
        initial_registers={"$t0": 0, "$t1": 5, "$t2": 7, "$s1": 9, "$s2": 4},
    )

    trace_text = [item["instructionText"] for item in result["executionTrace"]]
    assert "j end" in trace_text
    assert "sub $s0, $s1, $s2" in trace_text
    assert "add $t0, $t1, $t2" not in trace_text
    assert result["finalState"]["registers"]["$t0"] == 0
    assert not events_for_text(result, "add $t0, $t1, $t2", "write_back")
    assert events_for_text(result, "j end", "jump")


def test_load_use_inserts_exactly_one_stall_and_bubble_with_frozen_signals():
    result = simulate(
        "lw $s0, 0($t0)\nadd $s1, $s0, $t1",
        initial_registers={"$t0": 100, "$t1": 7},
        initial_memory={"100": 42},
    )

    stalls = cycle_events(result, "stall")
    bubbles = cycle_events(result, "bubble")
    assert result["metrics"]["stalls"] == 1
    assert len(stalls) == 1
    assert len(bubbles) == 1
    assert stalls[0]["cycle"] == bubbles[0]["cycle"] == 3
    assert bubbles[0]["signalValues"] == {"PCWrite": 0, "IF_IDWrite": 0, "ControlMux": 0}


def test_raw_dependency_uses_forwarding_without_stall():
    result = simulate("add $s0, $t0, $t1\nsub $t2, $s0, $t3")

    forwards = events_for_text(result, "sub $t2, $s0, $t3", "forwarding")
    assert result["metrics"]["stalls"] == 0
    assert forwards
    assert forwards[0]["target"] == "ALU_INPUT_A"
    assert forwards[0]["signalValues"]["ForwardA"] == "10"
    assert "ex_mem_forward_to_alu_a" in forwards[0]["wireIds"]


def test_zero_register_is_not_forwarded_or_written():
    result = simulate("add $zero, $t0, $t1\nsub $t2, $zero, $t3")

    assert result["finalState"]["registers"]["$zero"] == 0
    assert not cycle_events(result, "forwarding")
    assert not events_for_text(result, "add $zero, $t0, $t1", "write_back")


def test_sequential_mode_does_not_overlap_instructions():
    result = PipelineService().simulate(
        "add $s0, $t0, $t1\nsub $s1, $t2, $t3",
        forwarding=True,
        mode="sequential",
    )

    assert result["mode"] == "sequential"
    assert result["metrics"]["totalCycles"] == 10
    assert all(len(cycle["instructions"]) == 1 for cycle in result["cycles"])
    assert result["cycles"][4]["instructions"][0]["stage"] == "WB"
    assert result["cycles"][5]["instructions"][0]["stage"] == "IF"
