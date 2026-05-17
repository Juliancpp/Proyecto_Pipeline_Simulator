from app.mips.engine import run_code


def test_engine_executes_arithmetic_memory_and_branch():
    code = """
    addi $t0, $zero, 100
    addi $t1, $zero, 7
    sw $t1, 0($t0)
    lw $s0, 0($t0)
    beq $s0, $t1, done
    addi $s1, $zero, 1
    done:
    add $s2, $s0, $t1
    """
    result = run_code(code)

    assert result["registers"]["$s0"] == 7
    assert result["registers"]["$s1"] == 0
    assert result["registers"]["$s2"] == 14
    assert result["memory"]["100"] == 7
