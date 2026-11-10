# Lab02 演示应用镜像：Python + structlog
# 基础镜像为 docker.io 官方 python 镜像（podman 默认即从 docker.io 拉取）：
#   https://hub.docker.com/_/python
FROM python:3.12-slim

WORKDIR /app

# 先装依赖，利用镜像层缓存加速重复构建（podman build 同样受益）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# -u 关闭 stdout 缓冲：逐行可见。
# LOG_FILE（见 docker-compose.yml）会把同一份日志双写到共享卷文件，
# 供 Vector file source 采集——podman 环境无需 docker.sock。
CMD ["python", "-u", "app.py"]
