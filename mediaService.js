const LAMBDA_FUNCTION_URL =
"https://tsv4j2ufhfswtjhpab7q4ffadu0bsqob.lambda-url.eu-west-2.on.aws/";

export async function uploadMediaToS3(file) {
    try {
        const response = await fetch(LAMBDA_FUNCTION_URL, {
            method: "POST",
            headers:{
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
                fileName:file.name,
                fileType:file.type
            })
        });

        if(!response.ok){
            throw new Error("Failed to get upload URL");
        }

        const data = await response.json();
        const {
            uploadUrl,
            fileUrl
        } = data;

        const uploadResponse = await fetch(uploadUrl,{
            method:"PUT",
            headers:{
                "Content-Type":file.type
            },
            body:file
        });

        if(!uploadResponse.ok){
            throw new Error("S3 upload failed");
        }

        return fileUrl;
        
    } catch(error){
        console.error("Upload error:",error);
        return null;
    }
}

export function validateMedia(files){

    const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

    for(const file of files){

        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if(!isImage && !isVideo){
            return "Only images and videos are allowed.";
        }

        if(isImage && file.size > MAX_IMAGE_SIZE){
            return `${file.name} is larger than 50MB`;
        }

        if(isVideo && file.size > MAX_VIDEO_SIZE){
            return `${file.name} is larger than 50MB`;
        }
    }

    return null;
}