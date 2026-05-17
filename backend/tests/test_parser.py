from app.mips.parser import parse_mips
from app.mips.registers import normalize_register
from app.mips.transpiler import transpile


def test_parser_handles_labels_comments_and_offsets():
    code = """
    .text
    main:
      lw $s0, 8($t0) # load
      beq $s0, $zero, done
      add $s1, $s0, $s2
    done:
      sw $s1, 12($t0)
    """
    program = parse_mips(code)
    ir = transpile(program)

    assert program.labels["main"] == ir[0].address
    assert program.labels["done"] == ir[3].address
    assert ir[0].op == "lw"
    assert ir[0].base == "$t0"
    assert ir[0].offset == 8
    assert ir[1].target_address == ir[3].address


def test_numeric_registers_are_normalized():
    assert normalize_register("$8") == "$t0"
    assert normalize_register("$31") == "$ra"
