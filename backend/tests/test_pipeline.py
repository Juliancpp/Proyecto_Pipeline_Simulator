from app.services.pipeline_service import PipelineService


def test_pipeline_detects_load_use_hazard_and_bubble():
    result = PipelineService().simulate(
        "lw $s0, 20($s1)\nand $s4, $s0, $s5",
        forwarding=True,
    )

    assert result["metrics"]["stalls"] == 1
    assert any(hazard["type"] == "load-use" for hazard in result["hazards"])
    assert any(cycle["bubbles"] for cycle in result["cycles"])


def test_pipeline_emits_forwarding_event_for_alu_dependency():
    result = PipelineService().simulate(
        "add $s0, $s1, $s2\nand $s4, $s0, $s5",
        forwarding=True,
    )

    assert result["metrics"]["forwardingEvents"] >= 1
    assert any(event["register"] == "$s0" for event in result["forwardingEvents"])
