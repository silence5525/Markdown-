const urlParams = new URLSearchParams(window.location.search);
let mdPath = urlParams.get('path');

console.log('Initial mdPath:', mdPath);

// 确保路径已解码（URLSearchParams.get() 已经解码，但额外处理一次确保安全）
if (mdPath) {
    mdPath = decodeURIComponent(mdPath);
    console.log('Decoded mdPath:', mdPath);
}

function wrapImgUrl(content) {
    if (!content) return "";
    
    const pathRegex = /!\[(.*?)\]\((([a-zA-Z]:\\|\/)[^)]+)\)/g;
    
    return content.replace(pathRegex, (match, alt, fullPath) => {
        if (fullPath.includes('/api/view-abs-img')) return match;
        
        const proxyUrl = `/api/view-abs-img?absPath=${encodeURIComponent(fullPath)}`;
        return `![${alt}](${proxyUrl})`;
    });
}

function unwrapImgUrl(content) {
    if (!content) return "";
    return content.replace(/!\[(.*?)\]\(\/api\/view-abs-img\?absPath=([^)]+)\)/g, (match, alt, encodedPath) => {
        const originalPath = decodeURIComponent(encodedPath);
        return `![${alt}](${originalPath})`;
    });
}

const vditor = new Vditor('vditor', {
    height: window.innerHeight,
    cdn: './lib',
    lang: 'zh_CN',
    mode: 'ir',
    upload: {
        url: '/api/upload-image',
        extraData: { currentMdPath: mdPath },
        fieldName: 'file',
        linkToImgUrl(url) {
            return `/api/view-abs-img?absPath=${encodeURIComponent(url)}`;
        },
        format(files, responseText) {
            const res = JSON.parse(responseText);
            const proxyUrl = `/api/view-abs-img?absPath=${encodeURIComponent(res.data.url)}`;
            return JSON.stringify({
                code: 0,
                data: { errFiles: [], succMap: { [files[0].name]: proxyUrl } }
            });
        }
    },
    input: (value) => {
        const pureContent = unwrapImgUrl(value);
        fetch('/api/save-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: mdPath, content: pureContent })
        });
    },
    after: () => {
        if (mdPath) {
            console.log('Fetching content for:', mdPath);
            fetch(`/api/get-content?path=${encodeURIComponent(mdPath)}`)
                .then(res => {
                    console.log('Response status:', res.status);
                    return res.json();
                })
                .then(data => {
                    console.log('Content received:', data);
                    const previewContent = wrapImgUrl(data.content);
                    vditor.setValue(previewContent || "");
                })
                .catch(err => {
                    console.error('Fetch error:', err);
                });
        }
    }
});