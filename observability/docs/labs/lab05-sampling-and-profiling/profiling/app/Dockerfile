# lab05 profiling demo app
# 基础镜像：python:3.12-slim-bookworm（官方多架构镜像，支持 linux/amd64 与 linux/arm64）
FROM python:3.12-slim-bookworm

WORKDIR /app

# 先装依赖以利用 layer cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 5000

CMD ["python", "app.py"]
