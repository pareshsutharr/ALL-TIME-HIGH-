import sys
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
    "source_year", "accord_code", "company_name", "isin", "industry",
    "qtr_date_end", "qtr_net_sales", "qtr_profit_after_tax", "qtr_change_in_stocks",
    "qtr_cost_of_services_raw_materials", "qtr_purchase_of_finished_goods",
    "qtr_operating_profit_excl_oi", "qtr_pbidtm_pct_excl_oi",
    "shp_date_end", "shp_institutions_pct", "shp_fii_pct", "shp_fvci_pct",
    "shp_fpi_pct", "shp_ffi_banks_pct", "shp_foreign_bodies_dr_pct", "qtr_basis",
]

BATCH = 500
# The Management API used by `supabase db query --linked` rejects request
# bodies over ~3MB (413). Keep generated files well under that.
MAX_FILE_BYTES = 1_800_000

def process_year(year: int):
    df = pd.read_excel(f"data/{year}.xlsx", sheet_name="Sheet1", header=0)
    df = df.dropna(subset=["Accord Code"])

    rows = []
    # Plain positional tuples (index=False, name=None) so column access is
    # unambiguous by position, regardless of how pandas would rename the
    # non-identifier-safe source column names (e.g. "Sr.No.", "CD_ISIN No").
    for r in df.itertuples(index=False, name=None):
        (
            _sr_no, accord_code, company_name, isin, industry,
            qtr_date_end, qtr_net_sales, qtr_profit_after_tax, qtr_change_in_stocks,
            qtr_cost_of_services_raw_materials, qtr_purchase_of_finished_goods,
            qtr_operating_profit_excl_oi, qtr_pbidtm_pct_excl_oi,
            shp_date_end, shp_institutions_pct, shp_fii_pct, shp_fvci_pct,
            shp_fpi_pct, shp_ffi_banks_pct, shp_foreign_bodies_dr_pct, qtr_basis,
        ) = r
        vals = [
            str(year),
            sql_int(accord_code),
            sql_str(company_name),
            sql_str(isin),
            sql_str(industry),
            sql_yyyymm_date(qtr_date_end),
            sql_num(qtr_net_sales),
            sql_num(qtr_profit_after_tax),
            sql_num(qtr_change_in_stocks),
            sql_num(qtr_cost_of_services_raw_materials),
            sql_num(qtr_purchase_of_finished_goods),
            sql_num(qtr_operating_profit_excl_oi),
            sql_num(qtr_pbidtm_pct_excl_oi),
            sql_yyyymm_date(shp_date_end),
            sql_num(shp_institutions_pct),
            sql_num(shp_fii_pct),
            sql_num(shp_fvci_pct),
            sql_num(shp_fpi_pct),
            sql_num(shp_ffi_banks_pct),
            sql_num(shp_foreign_bodies_dr_pct),
            sql_str(qtr_basis),
        ]
        rows.append("(" + ", ".join(vals) + ")")

    statements = []
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        statements.append(
            f"insert into public.main_data ({', '.join(COLUMNS)}) values\n"
            + ",\n".join(chunk)
            + ";\n"
        )
    return statements, len(rows)

def write_chunked(year: int, statements: list[str]) -> int:
    header = f"-- Generated from {year}.xlsx by scripts/generate_main_data_seed.py\n\n"
    part = 1
    buf = [header]
    buf_size = len(header)
    files_written = 0

    def flush():
        nonlocal part, buf, buf_size, files_written
        if len(buf) <= 1:
            return
        out_path = f"supabase/main_data_seed_{year}_{part:02d}.sql"
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
    year = int(sys.argv[1])
    statements, n = process_year(year)
    files_written = write_chunked(year, statements)
    print(f"{year}: {n} rows -> {files_written} file(s)")
