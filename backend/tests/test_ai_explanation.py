from app.services import ai_explanation_service


def test_ai_explanation_falls_back_without_api_key(monkeypatch):
    monkeypatch.delenv("OLLAMA_API_KEY", raising=False)
    monkeypatch.setenv("OLLAMA_DISABLE_ENV_FILE", "1")

    response = ai_explanation_service.generate_ai_explanation(
        {
            "cycle": 3,
            "activeInstructions": [{"raw": "add $s0, $s1, $s2", "stage": "EX"}],
        }
    )

    assert response["provider"] == "mock"
    assert response["fallback"] is True
    assert "Ollama no esta configurado" in response["explanation"]


def test_ai_explanation_uses_ollama_response(monkeypatch):
    class FakeResponse:
        status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {"message": {"content": "Explicacion generada por Ollama."}}

    class FakeClient:
        def __init__(self, timeout):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return None

        def post(self, url, headers, json):
            assert url == "https://ollama.com/api/chat"
            assert headers["Authorization"].startswith("Bearer ")
            assert json["model"] == "gpt-oss:120b"
            return FakeResponse()

    monkeypatch.setenv("OLLAMA_API_KEY", "test-key")
    monkeypatch.setattr(ai_explanation_service.httpx, "Client", FakeClient)

    response = ai_explanation_service.generate_ai_explanation({"cycle": 1})

    assert response["provider"] == "ollama:gpt-oss:120b"
    assert response["fallback"] is False
    assert response["explanation"] == "Explicacion generada por Ollama."


def test_ai_prompt_is_educational_not_log_like():
    messages = ai_explanation_service._build_messages(
        {
            "cycle": 4,
            "totalCycles": 8,
            "explanationLevel": "intuitive",
            "activeInstructions": [{"raw": "sub $t2, $s0, $t3", "stage": "EX"}],
            "cycleEvents": [
                {
                    "type": "forwarding",
                    "message": "Forward $s0 from EX/MEM to ALU_INPUT_A.",
                    "register": "$s0",
                    "forwardA": "10",
                }
            ],
        }
    )

    system = messages[0]["content"]
    user = messages[1]["content"]
    assert "ENSENAR" in system
    assert "No hagas dumps de JSON" in system
    assert "Nivel 1 - Intuitivo" in system
    assert "Usa el contexto solo como evidencia tecnica" in user


def test_ai_fallback_explains_load_use_without_json_dump(monkeypatch):
    monkeypatch.delenv("OLLAMA_API_KEY", raising=False)
    monkeypatch.setenv("OLLAMA_DISABLE_ENV_FILE", "1")

    response = ai_explanation_service.generate_ai_explanation(
        {
            "cycle": 3,
            "totalCycles": 7,
            "explanationLevel": "university",
            "activeInstructions": [
                {"raw": "lw $s0, 0($t0)", "stage": "EX"},
                {"raw": "add $s1, $s0, $t1", "stage": "ID"},
            ],
            "cycleEvents": [
                {
                    "type": "stall",
                    "instructionText": "add $s1, $s0, $t1",
                    "stage": "ID",
                    "register": "$s0",
                    "signalValues": {"PCWrite": 0, "IF_IDWrite": 0, "ControlMux": 0},
                },
                {
                    "type": "bubble",
                    "stage": "ID/EX",
                    "signalValues": {"PCWrite": 0, "IF_IDWrite": 0, "ControlMux": 0},
                },
            ],
            "activeComponents": ["HazardDetectionUnit", "ControlMux", "ID_EX"],
        }
    )

    text = response["explanation"]
    assert "load-use" in text
    assert "PC e IF/ID" in text
    assert "JSON" not in text
    assert "cycleEvents" not in text
