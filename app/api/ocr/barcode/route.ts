"use server";

import { NextRequest, NextResponse } from "next/server";

interface OCRResult {
  success: boolean;
  code?: string;
  message?: string;
}

const encodeImageToBase64 = (imageBuffer: Buffer): string => {
  return imageBuffer.toString("base64");
};

const callOnlineOCR = async (imageBase64: string): Promise<OCRResult> => {
  try {
    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apikey: process.env.OCR_SPACE_API_KEY || "K89128095488957",
        base64image: imageBase64,
        isOverlayRequired: false,
        detectOrientation: true,
        scale: true,
      }),
    });

    const result = await response.json();
    
    if (result.IsErroredOnProcessing) {
      return { success: false, message: result.ErrorMessage || "OCR processing error" };
    }

    if (result.ParsedResults && result.ParsedResults.length > 0) {
      const text = result.ParsedResults[0].ParsedText;
      if (text) {
        const barcodeMatch = text.match(/[A-Za-z0-9]{8,20}/);
        if (barcodeMatch) {
          return { success: true, code: barcodeMatch[0] };
        }
        return { success: true, code: text.trim().replace(/\s+/g, "") };
      }
    }

    return { success: false, message: "No text detected" };
  } catch (error) {
    console.error("Online OCR error:", error);
    return { success: false, message: "Online OCR service unavailable" };
  }
};

const callAliyunOCR = async (imageBase64: string): Promise<OCRResult> => {
  try {
    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    
    if (!accessKeyId || !accessKeySecret) {
      return { success: false, message: "Aliyun credentials not configured" };
    }

    const response = await fetch(
      "https://ocrapi-advanced.aliyuncs.com/ocrservice/advanced",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ImageType: "URL",
          ImageValue: `data:image/png;base64,${imageBase64}`,
          DataType: 2,
        }),
      }
    );

    const result = await response.json();
    
    if (result.Code === 1000) {
      const text = result.Data.Paragraphs
        .map((p: any) => p.Text)
        .join("\n");
      const barcodeMatch = text.match(/[A-Za-z0-9]{8,20}/);
      if (barcodeMatch) {
        return { success: true, code: barcodeMatch[0] };
      }
      return { success: true, code: text.trim().replace(/\s+/g, "") };
    }

    return { success: false, message: result.Message || "Aliyun OCR failed" };
  } catch (error) {
    console.error("Aliyun OCR error:", error);
    return { success: false, message: "Aliyun OCR service unavailable" };
  }
};

const callTencentOCR = async (imageBase64: string): Promise<OCRResult> => {
  try {
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    
    if (!secretId || !secretKey) {
      return { success: false, message: "Tencent credentials not configured" };
    }

    const response = await fetch("https://ocr.tencentcloudapi.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "GeneralBasicOCR",
        Version: "2018-11-19",
        Region: "ap-beijing",
        ImageBase64: imageBase64,
      }),
    });

    const result = await response.json();
    
    if (result.Response && result.Response.TextDetections) {
      const text = result.Response.TextDetections
        .map((d: any) => d.DetectedText)
        .join("\n");
      const barcodeMatch = text.match(/[A-Za-z0-9]{8,20}/);
      if (barcodeMatch) {
        return { success: true, code: barcodeMatch[0] };
      }
      return { success: true, code: text.trim().replace(/\s+/g, "") };
    }

    return { success: false, message: "Tencent OCR failed" };
  } catch (error) {
    console.error("Tencent OCR error:", error);
    return { success: false, message: "Tencent OCR service unavailable" };
  }
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: "No image file provided" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const imageBase64 = encodeImageToBase64(buffer);

    const ocrServices = [
      () => callAliyunOCR(imageBase64),
      () => callTencentOCR(imageBase64),
      () => callOnlineOCR(imageBase64),
    ];

    for (const service of ocrServices) {
      const result = await service();
      if (result.success && result.code) {
        return NextResponse.json({
          success: true,
          code: result.code,
        });
      }
      console.log("OCR service failed:", result.message);
    }

    return NextResponse.json({
      success: false,
      message: "All OCR services failed, please try manual input",
    });
  } catch (error) {
    console.error("Barcode OCR API error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}