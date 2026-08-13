# Upload Folder — Alcohols Phenols and Ethers

**Subject:** Chemistry  
**Class:** Class 12  
**Unit:** Organic Chemistry (Class 12)  
**Chapter:** Alcohols Phenols and Ethers

## How to use

1. Generate your JSON using PDF Brain or manually create it
2. Name the file `set.json`
3. Drop it into **this folder** (replace this README with your set.json)
4. The app will automatically detect it and add it as a new set

## Required JSON Format

```json
{
  "chapter_name": "Chemistry",
  "chapter_index": 1,
  "quiz_sets": [
    {
      "set_name": "Custom Set Name (optional — auto-generated if not set)",
      "chapter_name": "Organic Chemistry (Class 12)",
      "subchapter": "Alcohols Phenols and Ethers",
      "set_description": "Your description",
      "questions": [
        {
          "question": "Your question text here",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": 0,
          "explanation": "Explanation for why the answer is correct"
        }
      ]
    }
  ]
}
```

The `answer` field is **0-indexed** (0 = Option A, 1 = Option B, 2 = Option C, 3 = Option D).
