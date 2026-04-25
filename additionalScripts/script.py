"""
Run this from your MiniBookLM root:
    python check_models.py

Make sure your .env has GEMINI_API_KEY set, or pass it directly.
"""

import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env")

client = genai.Client(api_key=API_KEY)

print("\n=== ALL AVAILABLE MODELS ===\n")
all_models = list(client.models.list())
for m in all_models:
    print(m.name)

print("\n=== EMBEDDING MODELS ONLY ===\n")
embed_models = [m for m in all_models if "embed" in m.name.lower()]
if embed_models:
    for m in embed_models:
        print(f"  {m.name}")
else:
    print("  No embedding models found under your API key.")

print("\n=== GEMINI GENERATION MODELS ===\n")
gen_models = [m for m in all_models if "gemini" in m.name.lower() and "embed" not in m.name.lower()]
for m in gen_models:
    print(f"  {m.name}")

print("\nDone. Paste the output to Claude.")