import socket
import subprocess
import sys
from pathlib import Path

import streamlit as st


APP_HOST = "127.0.0.1"
APP_PORT = 8504
APP_URL = f"http://{APP_HOST}:{APP_PORT}"
PROJECT_DIR = Path(__file__).resolve().parent


def app_is_running():
    with socket.socket() as connection:
        connection.settimeout(0.25)
        return connection.connect_ex((APP_HOST, APP_PORT)) == 0


if not app_is_running():
    subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "api:app",
            "--host",
            APP_HOST,
            "--port",
            str(APP_PORT),
        ],
        cwd=str(PROJECT_DIR),
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )

st.set_page_config(page_title="Safari Guide", page_icon=":material/landscape:")
st.markdown(
    f"""
    <meta http-equiv="refresh" content="1; url={APP_URL}">
    <style>
    .stApp {{ background: #f7f7f5; }}
    .block-container {{ max-width: 620px; padding-top: 20vh; text-align: center; }}
    h1 {{ color: #193027; font-family: Georgia, serif; }}
    p {{ color: #6c7971; }}
    a {{ color: #234d3d; font-weight: 700; }}
    </style>
    <h1>Opening Safari Guide...</h1>
    <p>If the new interface does not open automatically, <a href="{APP_URL}">open Safari Guide</a>.</p>
    """,
    unsafe_allow_html=True,
)
