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

  const queryString = Object.keys(sortedParams)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(sortedParams[key])}`)
    .join("&");

  const stringToSign = `POST&%2F&${encodeURIComponent(queryString)}`;

  const sign = crypto.createHmac("sha1", accessKeySecret + "&").update(stringToSign).digest("base64");
  return sign;
};

const sha256 = (data: string): string => {
  return crypto.createHash("sha256").update(data).digest("hex");
};

const getVolcengineSignature = (
  method: string,
  path: string,
  queryParams: Record<string, string>,
  bodyParams: Record<string, string>,
  accessKeyId: string,
  accessKeySecret: string,
  timestamp: string
): string => {
  const region = "cn-north-1";
  const service = "cv";

  const sortedQuery = Object.keys(queryParams).sort().reduce((acc, key) => {
    acc[key] = queryParams[key];
    return acc;
  }, {} as Record<string, string>);

  const canonicalQueryString = Object.keys(sortedQuery)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(sortedQuery[key])}`)
    .join("&");

  const sortedBody = Object.keys(bodyParams).sort().reduce((acc, key) => {
    acc[key] = bodyParams[key];
    return acc;
  }, {} as Record<string, string>);

  const requestPayload = Object.keys(sortedBody)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(sortedBody[key])}`)
    .join("&");

  const hashedRequestPayload = sha256(requestPayload);

  const canonicalHeaders = `content-type:application/x-www-form-urlencoded\nhost:visual.volcengineapi.com\nx-date:${timestamp}\n`;
  const signedHeaders = "content-type;host;x-date";

  const canonicalRequest = `${method}\n${path}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

  const hashedCanonicalRequest = sha256(canonicalRequest);

  const dateStr = new Date(parseInt(timestamp) * 1000).toISOString().slice(0, 10).replace(/-/g, "");
  const credentialScope = `${dateStr}/${region}/${service}/request`;

  const stringToSign = `HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  const kDate = crypto.createHmac("sha256", accessKeySecret).update(dateStr).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
  const kSigning = crypto.createHmac("sha256", kService).update("request").digest();

  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  return signature;
};

const callAliyunOCR = async (imageBase64: string): Promise<OCRResult> => {
  try {
    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    
    if (!accessKeyId || !accessKeySecret) {
      return { success: false, message: "Aliyun credentials not configured" };
    }

    const date = new Date();
    const timestamp = date.toISOString().replace(/\.\d{3}Z$/, "Z");
    const nonce = Math.random().toString(36).substring(2, 15);

    const params: Record<string, string> = {
      Action: "RecognizeBarcode",
      Format: "JSON",
      ImageData: imageBase64,
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
    
    console.log("Aliyun OCR response status:", response.status);
    console.log("Aliyun OCR response full:", JSON.stringify(result));
    
    if (result.Code === 200) {
      if (result.Data && result.Data.BarcodeList && result.Data.BarcodeList.length > 0) {
        const barcode = result.Data.BarcodeList[0];
        if (barcode && barcode.BarcodeValue) {
          return { success: true, code: barcode.BarcodeValue };
        }
        if (barcode && barcode.Value) {
          return { success: true, code: barcode.Value };
        }
        if (barcode && barcode.Text) {
          return { success: true, code: barcode.Text };
        }
      }
      if (result.Data && result.Data.Content) {
        const text = result.Data.Content;
        const barcode = extractBarcodeFromText(text);
        if (barcode) {
          return { success: true, code: barcode };
        }
        return { success: true, code: text.trim().replace(/\s+/g, "") };
      }
      if (result.BarcodeList && result.BarcodeList.length > 0) {
        const barcode = result.BarcodeList[0];
        if (barcode && barcode.BarcodeValue) {
          return { success: true, code: barcode.BarcodeValue };
        }
        if (barcode && barcode.Value) {
          return { success: true, code: barcode.Value };
        }
      }
    }

    return { success: false, message: result.Message || result.Code || result.ErrorMessage || "Aliyun OCR failed" };
  } catch (error) {
    console.error("Aliyun OCR error:", error);
    return { success: false, message: "Aliyun OCR service unavailable: " + String(error) };
  }
};

const extractBarcodeFromText = (text: string): string | null => {
  const patterns = [
    /[A-Za-z]{2}\s*\d{2}\s*\d{5}\s*\d{3}\s*[A-Za-z]{2}/,
    /[A-Za-z]{2}\d{9}[A-Za-z]{2}/,
    /\d{10,}/,
    /[A-Za-z0-9]{8,25}/,
  ];

  const cleanText = text.replace(/[，。、；：""''（）【】]/g, " ");

  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const code = match[0].replace(/\s+/g, "");
      if (code.length >= 8) {
        return code;
      }
    }
  }

  return null;
};

const callVolcengineOCR = async (imageBase64: string): Promise<OCRResult> => {
  try {
    const accessKeyId = process.env.VOLCENGINE_ACCESS_KEY_ID;
    const accessKeySecret = process.env.VOLCENGINE_ACCESS_KEY_SECRET;
    
    if (!accessKeyId || !accessKeySecret) {
      return { success: false, message: "Volcengine credentials not configured" };
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();

    const queryParams: Record<string, string> = {
      Action: "OCRNormal",
      Version: "2020-08-26",
    };

    const bodyParams: Record<string, string> = {
      image_base64: imageBase64,
    };

    const signature = getVolcengineSignature(
      "POST",
      "/",
      queryParams,
      bodyParams,
      accessKeyId,
      accessKeySecret,
      timestamp
    );

    const dateStr = new Date(parseInt(timestamp) * 1000).toISOString().slice(0, 10).replace(/-/g, "");
    const credential = `${accessKeyId}/${dateStr}/cn-north-1/cv/request`;

    const response = await fetch("https://visual.volcengineapi.com/?" + new URLSearchParams(queryParams).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Host": "visual.volcengineapi.com",
        "X-Date": timestamp,
        "Authorization": `HMAC-SHA256 Credential=${credential}, SignedHeaders=content-type;host;x-date, Signature=${signature}`,
      },
      body: new URLSearchParams(bodyParams).toString(),
    });

    const result = await response.json();
    
    console.log("Volcengine OCR response status:", response.status);
    console.log("Volcengine OCR response full:", JSON.stringify(result).substring(0, 1000));
    
    if (result.code === 10000 && result.data && result.data.line_texts) {
      const texts = result.data.line_texts;
      if (texts.length > 0) {
        const allText = texts.join(" ");
        const barcode = extractBarcodeFromText(allText);
        if (barcode) {
          return { success: true, code: barcode };
        }
        return { success: true, code: allText.trim().replace(/\s+/g, "") };
      }
    }

    return { success: false, message: result.message || result.code || "Volcengine OCR failed" };
  } catch (error) {
    console.error("Volcengine OCR error:", error);
    return { success: false, message: "Volcengine OCR service unavailable: " + String(error) };
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
        OCREngine: 2,
      }),
    });

    const result = await response.json();
    
    if (result.IsErroredOnProcessing) {
      return { success: false, message: result.ErrorMessage || "OCR processing error" };
    }

    if (result.ParsedResults && result.ParsedResults.length > 0) {
      const text = result.ParsedResults[0].ParsedText;
      if (text) {
        const barcode = extractBarcodeFromText(text);
        if (barcode) {
          return { success: true, code: barcode };
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

    console.log("Barcode OCR API: image size", buffer.length, "bytes");
    
    const ocrServices = [
      () => callOnlineOCR(imageBase64),
      () => callAliyunOCR(imageBase64),
      () => callVolcengineOCR(imageBase64),
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
      { success: false, message: "Server error: " + String(error) },
      { status: 500 }
    );
  }
}