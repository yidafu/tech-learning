# lab01 示例应用镜像：无编译依赖，pip 安装即用
# 基础镜像 tag 以官方发布为准（https://hub.docker.com/_/python）
FROM python:3.12-slim

WORKDIR /app

# 先装依赖（利用镜像层缓存）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 8000

# 生产可用 exec 形式；lab 演示足够
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
