from app.main import cors_origins


def test_cors_defaults_include_vite_8081(monkeypatch):
    monkeypatch.delenv("BACKEND_CORS_ORIGINS", raising=False)

    origins = cors_origins()

    assert "http://127.0.0.1:8081" in origins
    assert "http://localhost:8081" in origins
    assert "*" not in origins


def test_cors_origins_can_be_configured_from_env(monkeypatch):
    monkeypatch.setenv(
        "BACKEND_CORS_ORIGINS",
        "http://example.test,http://localhost:5173",
    )

    assert cors_origins() == ["http://example.test", "http://localhost:5173"]
