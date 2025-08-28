MOCK_DB = {
    "SUBJ_7F2A": [
        {"id":"doc1","textSanitised":"SUBJ_7F2A, a Singaporean fintech exec, was fined in 2023 for MAS breach.","source":"internal/news/2019-adverse.pdf"},
        {"id":"doc2","textSanitised":"Media report suggests regulatory warning issued in 2019; no criminal conviction.","source":"vendor/adverse/2023-report.html"}
    ]
}
def internal_search(subject_token: str, filters: dict):
    return MOCK_DB.get(subject_token, [])
