from app.services import call_ollama_fallback
import json
print("Calling raw...")
res = call_ollama_fallback("Test prompt")
print(res)
