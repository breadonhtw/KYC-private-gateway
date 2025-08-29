MOCK_DB = {
    "SUBJ_3D64": [
        {"id":"doc1","textSanitised":"SUBJ_7F2A, a Singaporean fintech exec, was fined in 2023 for MAS breach.","source":"internal/news/2019-adverse.pdf"},
        {"id":"doc2","textSanitised":"Media report suggests regulatory warning issued in 2019; no criminal conviction.","source":"vendor/adverse/2023-report.html"}
    ]
}

def internal_search(subject_token: str, filters: dict):
    # If exact token not found, return generic results for any SUBJ_ token
    if subject_token in MOCK_DB:
        return MOCK_DB[subject_token]
    elif subject_token.startswith("SUBJ_"):
        # Return generic results for any subject token
        return [
            {"id":"doc_gen1","textSanitised":f"{subject_token}, a financial professional, has clean compliance record.","source":"internal/screening/clean.pdf"},
            {"id":"doc_gen2","textSanitised":"No adverse media found in recent searches.","source":"vendor/media/current.html"}
        ]
    return []