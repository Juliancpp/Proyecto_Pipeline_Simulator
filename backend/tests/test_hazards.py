from app.mips.parser import parse_mips
from app.mips.hazards import detect_raw_hazards
from app.mips.transpiler import transpile


def test_raw_hazard_detection():
    ir = transpile(parse_mips("add $s0, $s1, $s2\nsub $t0, $s0, $s3"))
    hazards = detect_raw_hazards(ir)

    assert hazards
    assert hazards[0]["registers"] == ["$s0"]
