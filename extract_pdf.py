import pdfplumber
import sys

files = [
    r"C:\Users\s286a\Downloads\타겟채권ETF재간접형_C00184_WBF1.pdf",
    r"C:\Users\s286a\Downloads\이머징채권ETF재간접_C00353_EBE.pdf",
    r"C:\Users\s286a\Downloads\글로벌배당ETF재간접형_C00191_GDF.pdf",
    r"C:\Users\s286a\Downloads\글로벌바이오헬스ETF_C00438_HCE.pdf",
    r"C:\Users\s286a\Downloads\MMF재간접_C00013_MMF.pdf",
    r"C:\Users\s286a\Downloads\KOSPI200미국채혼합ETF재간접형_C00413_KUB.pdf",
    r"C:\Users\s286a\Downloads\골드ETF재간접Ⅱ_C00382_GLE.pdf",
]

for f in files:
    print(f"\n{'='*80}")
    print(f"FILE: {f}")
    print('='*80)
    try:
        with pdfplumber.open(f) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    print(f"\n--- Page {i+1} ---")
                    print(text)
    except Exception as e:
        print(f"ERROR: {e}")
