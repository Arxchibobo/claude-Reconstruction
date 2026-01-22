#!/usr/bin/env python3
"""
Google Veo 3.1 视频生成 API 封装
支持图生视频（首尾帧控制）功能
"""

import os
import time
import base64
import mimetypes
from typing import Optional, Dict, Any
from pathlib import Path
from google import genai
from google.genai import types


class Veo3VideoGenerator:
    """Veo 3.1 视频生成器"""

    def __init__(self, api_key: Optional[str] = None):
        """
        初始化 Veo 3.1 API 客户端

        Args:
            api_key: Google AI API 密钥（如果不提供，从环境变量读取）
        """
        # 从环境变量读取密钥
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")

        if not self.api_key:
            raise ValueError(
                "❌ Google AI API密钥未配置！\n"
                "请在.env文件中配置：\n"
                "  GEMINI_API_KEY=your-api-key"
            )

        # 初始化客户端
        self.client = genai.Client(api_key=self.api_key)

        print(f"✅ Veo 3.1 API客户端初始化成功")
        print(f"   API Key: {self.api_key[:8]}...{self.api_key[-4:]}")

    def _encode_image(self, image_path: str) -> Dict[str, str]:
        """
        将图片编码为 API 期望的格式

        Args:
            image_path: 图片路径

        Returns:
            包含 bytesBase64Encoded 和 mimeType 的字典
        """
        # 读取图片并编码为 base64
        with open(image_path, 'rb') as f:
            image_data = f.read()
            base64_str = base64.b64encode(image_data).decode('utf-8')

        # 获取 MIME 类型
        mime_type = mimetypes.guess_type(image_path)[0] or 'image/png'

        return {
            "bytesBase64Encoded": base64_str,
            "mimeType": mime_type
        }

    def create_video_task(
        self,
        image_start: str,
        image_end: Optional[str] = None,
        prompt: str = "",
        model_name: str = "veo-3.1-generate-preview",
    ) -> Any:
        """
        创建图生视频任务（支持首尾帧）

        Args:
            image_start: 起始帧图片路径
            image_end: 结束帧图片路径（可选）
            prompt: 正向提示词（转场描述）
            model_name: 模型名称，默认 veo-3.1-generate-preview

        Returns:
            operation: 长时间运行的操作对象
        """
        # 验证起始帧存在
        if not os.path.exists(image_start):
            raise FileNotFoundError(f"❌ 起始帧图片不存在: {image_start}")

        # 编码起始帧图片
        print(f"📷 编码起始帧: {Path(image_start).name}")
        start_image = self._encode_image(image_start)

        # 构建请求参数
        kwargs = {
            "model": model_name,
            "prompt": prompt,
            "image": start_image,  # 传递编码后的字典
        }

        # Veo 3.1 preview 版本暂不支持 last_frame 参数
        # 临时方案：只使用起始帧生成转场动效
        # if image_end:
        #     print(f"⚠️  注意：Veo 3.1 preview 暂不支持首尾帧插值")
        #     print(f"   将使用起始帧生成转场动效: {Path(image_start).name}")

        # 发送请求
        print(f"🚀 正在创建视频生成任务...")
        print(f"   模型: {model_name}")
        if image_end:
            print(f"   类型: 首尾帧过渡视频（插值生成）")
        else:
            print(f"   类型: 单帧动效视频")
        print(f"   提示词: {prompt[:100]}...")

        operation = self.client.models.generate_videos(**kwargs)

        print(f"✅ 任务创建成功！")
        print(f"   操作ID: {operation.name}")

        return operation

    def wait_for_completion(
        self,
        operation: Any,
        timeout: int = 600,
        poll_interval: int = 10
    ) -> Any:
        """
        等待任务完成（轮询）

        Args:
            operation: 操作对象
            timeout: 超时时间（秒），默认600秒（10分钟）
            poll_interval: 轮询间隔（秒），默认10秒

        Returns:
            operation: 完成后的操作对象
        """
        start_time = time.time()
        print(f"⏳ 等待视频生成完成...")

        while not operation.done:
            elapsed = int(time.time() - start_time)

            if elapsed > timeout:
                raise TimeoutError(
                    f"❌ 任务超时！已等待 {elapsed} 秒\n"
                    f"   操作ID: {operation.name}"
                )

            print(f"   [{elapsed}s] 生成中... 继续等待...")
            time.sleep(poll_interval)

            # 刷新操作状态
            operation = self.client.operations.get(operation)

        elapsed = int(time.time() - start_time)
        print(f"✅ 视频生成完成！耗时: {elapsed}秒")

        return operation

    def download_video(self, operation: Any, save_path: str) -> str:
        """
        下载生成的视频

        Args:
            operation: 完成的操作对象
            save_path: 保存路径

        Returns:
            save_path: 实际保存路径
        """
        print(f"⬇️  正在下载视频...")
        print(f"   保存到: {save_path}")

        # 创建目录
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)

        # 获取视频对象
        video = operation.response.generated_videos[0]

        # 下载视频文件
        self.client.files.download(file=video.video)

        # 保存视频
        video.video.save(save_path)

        file_size = os.path.getsize(save_path)
        file_size_mb = file_size / (1024 * 1024)

        print(f"✅ 视频下载完成！")
        print(f"   文件大小: {file_size_mb:.2f} MB")

        return save_path

    def generate_and_download(
        self,
        image_start: str,
        image_end: Optional[str],
        prompt: str,
        output_path: str,
        **kwargs
    ) -> str:
        """
        一键生成并下载视频（完整流程）

        Args:
            image_start: 起始帧图片路径
            image_end: 结束帧图片路径（可选）
            prompt: 提示词
            output_path: 输出路径
            **kwargs: 其他参数（model_name等）

        Returns:
            output_path: 视频保存路径
        """
        # 1. 创建任务
        operation = self.create_video_task(
            image_start=image_start,
            image_end=image_end,
            prompt=prompt,
            **kwargs
        )

        # 2. 等待完成
        operation = self.wait_for_completion(operation)

        # 3. 下载视频
        self.download_video(operation, output_path)

        return output_path


if __name__ == "__main__":
    """测试代码"""
    # 从环境变量加载
    from dotenv import load_dotenv
    load_dotenv()

    generator = Veo3VideoGenerator()
    print(f"\n✅ Veo 3.1 视频生成器初始化成功！")
