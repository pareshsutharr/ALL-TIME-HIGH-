import pandas as pd

def sql_str(v):
    if pd.isna(v):
        return "NULL"
    s = str(v).replace("'", "''")
    return f"'{s}'"

def sql_num(v):
    if pd.isna(v):
        return "NULL"
    return repr(float(v))

def sql_int(v):
    if pd.isna(v):
        return "NULL"
    return str(int(v))

def sql_yyyymm_date(v):
    if pd.isna(v):
        return "NULL"
    period = pd.Period(str(int(v)), freq="M")
    return f"'{period.end_time.date().isoformat()}'"

COLUMNS = [
    "accord_code", "company_name", "isin", "industry",
    "fy_date_end", "roe_pct", "roce_pct", "basis",
]

BATCH = 500
# The Management API used by `supabase db query --linked` rejects request
# bodies over ~3MB (413). Keep generated files well under that.
MAX_FILE_BYTES = 1_800_000

def process():
    df = pd.read_excel("data/roc_roce.xlsx", sheet_name="Sheet1", header=3)
    df = df.dropna(subset=["Accord Code"])

    rows = []
    # Plain positional tuples (index=False, name=None) so column access is
    # unambiguous by position: Sr.No., Accord Code, Company Name,
    # CD_Industry, CD_ISIN No, FR_Year End, FR_ROE (%), FR_ROCE (%), CONS_FR_1.
    for r in df.itertuples(index=False, name=None):
        (
            _sr_no, accord_code, company_name, industry, isin,
            fy_year_end, roe_pct, roce_pct, basis,
        ) = r
        vals = [
            sql_int(accord_code),
            sql_str(company_name),
            sql_str(isin),
            sql_str(industry),
            sql_yyyymm_date(fy_year_end),
            sql_num(roe_pct),
            sql_num(roce_pct),
            sql_str(basis),
        ]
        rows.append("(" + ", ".join(vals) + ")")

    statements = []
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        statements.append(
            f"insert into public.roe_roce_data ({', '.join(COLUMNS)}) values\n"
            + ",\n".join(chunk)
            + ";\n"
        )
    return statements, len(rows)

def write_chunked(statements: list[str]) -> int:
    header = "-- Generated from data/roc_roce.xlsx by scripts/generate_roe_roce_seed.py\n\n"
    part = 1
    buf = [header]
    buf_size = len(header)
    files_written = 0

    def flush():
        nonlocal part, buf, buf_size, files_written
        if len(buf) <= 1:
            return
        out_path = f"supabase/roe_roce_seed_{part:02d}.sql"
        with open(out_path, "w") as f:
            f.write("".join(buf))
        files_written += 1
        part += 1
        buf = [header]
        buf_size = len(header)

    for stmt in statements:
        if buf_size + len(stmt) > MAX_FILE_BYTES and len(buf) > 1:
            flush()
        buf.append(stmt)
        buf_size += len(stmt)
    flush()
    return files_written

if __name__ == "__main__":
    statements, n = process()
    files_written = write_chunked(statements)
    print(f"{n} rows -> {files_written} file(s)")
