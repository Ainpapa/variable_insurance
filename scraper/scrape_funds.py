"""
카디프생명 변액보험 펀드 기준가 스크래핑
- 매일 GitHub Actions에서 실행
- 시그니처 ETF변액연금보험 2.0(적립형) 무배당 기준
- 결과를 fund-data.json으로 저장
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright

# 카디프생명 변액보험 공시 페이지
URL = "https://www.cardif.co.kr/disclosure/papav101.do"

# 상품명
PRODUCT_NAME = "시그니처 ETF변액연금보험 2.0(적립형) 무배당"

# 출력 경로 (프로젝트 루트의 fund-data.json)
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fund-data.json")


def scrape():
    """카디프생명 웹사이트에서 펀드 기준가 데이터를 스크래핑합니다."""

    kst = timezone(timedelta(hours=9))
    now = datetime.now(kst)

    print(f"[{now.strftime('%Y-%m-%d %H:%M:%S KST')}] 스크래핑 시작...")
    print(f"대상 URL: {URL}")
    print(f"상품: {PRODUCT_NAME}")

    with sync_playwright() as p:
        # 헤드리스 브라우저 실행
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        try:
            # 1. 페이지 접속
            print("페이지 로딩 중...")
            page.goto(URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)

            # 2. 상품 선택 드롭다운 찾기 및 변경
            print(f"상품 선택: {PRODUCT_NAME}")

            # select 박스 찾기 (일반적인 패턴들 시도)
            selectors = [
                "select[name*='prod']",
                "select[name*='Prod']",
                "select[name*='prd']",
                "select[id*='prod']",
                "select[id*='Prod']",
                "select[id*='prd']",
                "select.product",
                "#productSelect",
                "select:first-of-type",
            ]

            select_found = False
            for selector in selectors:
                try:
                    select_el = page.query_selector(selector)
                    if select_el:
                        # option 목록 확인
                        options = page.query_selector_all(f"{selector} option")
                        for opt in options:
                            text = opt.inner_text().strip()
                            if PRODUCT_NAME in text or "시그니처" in text:
                                value = opt.get_attribute("value")
                                page.select_option(selector, value=value)
                                print(f"  선택됨: {text} (value={value})")
                                select_found = True
                                break
                    if select_found:
                        break
                except Exception:
                    continue

            if not select_found:
                # 모든 select 박스를 순회하며 찾기
                print("  일반 셀렉터로 찾지 못함, 모든 select 순회...")
                all_selects = page.query_selector_all("select")
                for i, sel in enumerate(all_selects):
                    options = sel.query_selector_all("option")
                    for opt in options:
                        text = opt.inner_text().strip()
                        if "시그니처" in text or "ETF변액" in text:
                            value = opt.get_attribute("value")
                            sel_id = sel.get_attribute("id") or sel.get_attribute("name") or f"select[{i}]"
                            page.select_option(f"#{sel.get_attribute('id')}" if sel.get_attribute('id') else f"select:nth-of-type({i+1})", value=value)
                            print(f"  선택됨 ({sel_id}): {text}")
                            select_found = True
                            break
                    if select_found:
                        break

            if not select_found:
                print("  경고: 상품 선택을 찾지 못했습니다. 기본 상품으로 진행합니다.")

            page.wait_for_timeout(1000)

            # 3. 조회 버튼 클릭
            print("조회 버튼 클릭...")
            search_selectors = [
                "button:has-text('조회')",
                "a:has-text('조회')",
                "input[type='button'][value*='조회']",
                "input[type='submit'][value*='조회']",
                ".btn-search",
                "#searchBtn",
                "button.search",
            ]

            search_clicked = False
            for selector in search_selectors:
                try:
                    btn = page.query_selector(selector)
                    if btn:
                        btn.click()
                        print(f"  클릭됨: {selector}")
                        search_clicked = True
                        break
                except Exception:
                    continue

            if not search_clicked:
                print("  경고: 조회 버튼을 찾지 못했습니다.")

            # 데이터 로딩 대기
            page.wait_for_timeout(3000)
            page.wait_for_load_state("networkidle")

            # 4. 테이블 데이터 추출
            print("데이터 추출 중...")

            # 테이블 찾기
            tables = page.query_selector_all("table")
            print(f"  발견된 테이블 수: {len(tables)}")

            funds = []

            for table_idx, table in enumerate(tables):
                rows = table.query_selector_all("tr")
                if len(rows) < 2:
                    continue

                # 헤더 분석
                headers = []
                header_row = rows[0]
                ths = header_row.query_selector_all("th")
                if not ths:
                    ths = header_row.query_selector_all("td")

                for th in ths:
                    headers.append(th.inner_text().strip())

                # 기준가/전일대비 관련 헤더가 있는 테이블인지 확인
                header_text = " ".join(headers)
                if not any(kw in header_text for kw in ["기준가", "기준가격", "수익률", "전일"]):
                    continue

                print(f"  테이블 {table_idx} 헤더: {headers}")

                # 데이터 행 파싱
                for row in rows[1:]:
                    cells = row.query_selector_all("td")
                    if len(cells) < 2:
                        continue

                    cell_texts = [c.inner_text().strip() for c in cells]

                    # 펀드 데이터 구성
                    fund = {}
                    for i, header in enumerate(headers):
                        if i < len(cell_texts):
                            key = header.replace(" ", "").replace("\n", "")
                            fund[key] = cell_texts[i]

                    if fund:
                        funds.append(fund)

            # 5. 데이터 정규화
            print(f"  추출된 펀드 수: {len(funds)}")

            normalized = []
            for fund in funds:
                entry = {
                    "raw": fund,  # 원본 데이터 보존
                }

                # 공통 필드 매핑 시도
                for key, val in fund.items():
                    if "펀드" in key and "명" in key:
                        entry["name"] = val
                    elif key == "펀드명" or key == "펀드":
                        entry["name"] = val
                    elif "기준가" in key and "전일" not in key:
                        entry["nav"] = val.replace(",", "")
                    elif "전일" in key:
                        entry["change"] = val.replace(",", "")
                    elif "총좌수" in key or "좌수" in key:
                        entry["totalShares"] = val.replace(",", "")
                    elif "3개월" in key or "3M" in key:
                        entry["r3m"] = val.replace("%", "").replace(",", "")
                    elif "6개월" in key or "6M" in key:
                        entry["r6m"] = val.replace("%", "").replace(",", "")
                    elif "1년" in key or "1Y" in key or "12개월" in key:
                        entry["r1y"] = val.replace("%", "").replace(",", "")
                    elif "설정이후" in key or "설정일" in key:
                        entry["sinceInception"] = val.replace("%", "").replace(",", "")

                # name이 없으면 첫 번째 값 사용
                if "name" not in entry and fund:
                    first_val = list(fund.values())[0]
                    if first_val and len(first_val) > 1:
                        entry["name"] = first_val

                normalized.append(entry)

            # 6. 페이지 스크린샷 저장 (디버깅용)
            screenshot_path = os.path.join(os.path.dirname(OUTPUT_PATH), "scraper", "debug_screenshot.png")
            try:
                page.screenshot(path=screenshot_path, full_page=True)
                print(f"  디버깅 스크린샷 저장: {screenshot_path}")
            except Exception as e:
                print(f"  스크린샷 저장 실패: {e}")

            # 7. 결과 저장
            result = {
                "lastUpdated": now.strftime("%Y-%m-%d %H:%M:%S"),
                "product": PRODUCT_NAME,
                "source": URL,
                "fundCount": len(normalized),
                "funds": normalized
            }

            with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            print(f"\n저장 완료: {OUTPUT_PATH}")
            print(f"펀드 수: {len(normalized)}")

            if normalized:
                print("\n--- 샘플 데이터 (처음 3개) ---")
                for fund in normalized[:3]:
                    print(json.dumps(fund, ensure_ascii=False, indent=2))

            return result

        except Exception as e:
            print(f"오류 발생: {e}")

            # 오류 시에도 스크린샷 저장
            try:
                error_screenshot = os.path.join(os.path.dirname(OUTPUT_PATH), "scraper", "error_screenshot.png")
                page.screenshot(path=error_screenshot, full_page=True)
                print(f"오류 스크린샷: {error_screenshot}")
            except:
                pass

            # 오류 시 기존 데이터 유지 (파일이 있으면)
            if os.path.exists(OUTPUT_PATH):
                print("기존 fund-data.json 유지")
            else:
                # 빈 결과 저장
                result = {
                    "lastUpdated": now.strftime("%Y-%m-%d %H:%M:%S"),
                    "product": PRODUCT_NAME,
                    "source": URL,
                    "error": str(e),
                    "fundCount": 0,
                    "funds": []
                }
                with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)

            raise

        finally:
            browser.close()
            print("브라우저 종료")


if __name__ == "__main__":
    scrape()
