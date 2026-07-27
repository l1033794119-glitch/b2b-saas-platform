"use server";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

interface OCRResult {
  success: boolean;
  code?: string;
  message?: string;
}

const encodeImageToBase64 = (imageBuffer: Buffer): string => {
  return imageBuffer.toString("base64");
};

const getAliyunSignature = (params: Record<string, string>, accessKeySecret: string): string => {
  const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
    acc[key] = params[key];
    return acc;
  }, {} as Record<string, string>);

  const stringToSign = Object.keys(sortedParams)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(sortedParams[key])}`)
    .join("&");

  const sign = crypto.createHmac("sha1", accessKeySecret + "&").update(stringToSign).digest("base64");
  return sign;
};

const callAliyunOCR = async (imageBase64: string): Promise<OCRResult> => {
  try {
    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    
    if (!accessKeyId || !accessKeySecret) {
      return { success: false, message: "Aliyun credentials not configured" };
    }

    const timestamp = new Date().toISOString();
    const nonce = Math.random().toString(36).substring(2, 15);

    const params: Record<string, string> = {
      Action: "RecognizeBarcode",
      Format: "JSON",
      ImageURL: `data:image/png;base64,${imageBase64}`,
      RegionId: "cn-hangzhou",
      Timestamp: timestamp,
      Version: "2019-12-30",
      AccessKeyId: accessKeyId,
      SignatureMethod: "HMAC-SHA1",
      SignatureNonce: nonce,
      SignatureVersion: "1.0",
    };

    const signature = getAliyunSignature(params, accessKeySecret);

    const response = await fetch("https://ocr.cn-hangzhou.aliyuncs.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        ...params,
        Signature: signature,
      }),
    });

    const result = await response.json();
    
    if (result.Code === 200 && result.Data && result.Data.BarcodeList) {
      const barcode = result.Data.BarcodeList[0];
      if (barcode && barcode.BarcodeValue) {
        return { success: true, code: barcode.BarcodeValue };
      }
    }

    if (result.Code === 200 && result.Data && result.Data.Content) {
      const text = result.Data.Content;
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