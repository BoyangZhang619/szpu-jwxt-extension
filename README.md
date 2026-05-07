# SZPU教务课表获取

## 0. 快速使用

无论如何， **需要连接校园网**

### 0.1 curl

在电脑打开终端或者使用移动设备的比如termux，输出下面代码
需修改值：
1. **XH** 对应你的学号
2. **XNXQDM** 2025-2026-2指25到26年的第二学期，按需改

bash(linux,termux)
```bash(linux,termux)
curl 'https://jwxt.szpu.edu.cn/jwapp/sys/kcbcxmdl/KbcxController/queryxskb.do'  -X POST  -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8'  -H 'X-Requested-With: XMLHttpRequest'  -H 'Accept: application/json, text/javascript, */*; q=0.01'  --data-urlencode 'requestParamStr={"*order":"+SKXQ,+KSJC,+JSJC","XNXQDM":"2025-2026-2","XH":"250200001"}'
```
window|powershell
```window|powershell
curl.exe "https://jwxt.szpu.edu.cn/jwapp/sys/kcbcxmdl/KbcxController/queryxskb.do" -X POST -H "Content-Type: application/x-www-form-urlencoded; charset=UTF-8" -H "X-Requested-With: XMLHttpRequest" -H "Accept: application/json, text/javascript, */*; q=0.01" --data-urlencode "requestParamStr={`"*order`":`"+SKXQ,+KSJC,+JSJC`",`"XNXQDM`":`"2025-2026-2`",`"XH`":`"250200001`"}"
```
window|cmd
```window|cmd
curl "https://jwxt.szpu.edu.cn/jwapp/sys/kcbcxmdl/KbcxController/queryxskb.do" -X POST -H "Content-Type: application/x-www-form-urlencoded; charset=UTF-8" -H "X-Requested-With: XMLHttpRequest" -H "Accept: application/json, text/javascript, */*; q=0.01" --data-urlencode "requestParamStr={\"*order\":\"+SKXQ,+KSJC,+JSJC\",\"XNXQDM\":\"2025-2026-2\",\"XH\":\"250200001\"}"
```

### 0.2 curl range

同0.1，但可以获取多人的数据
需修改值：
1. **START** 和 **END** 对应的是获取学号序列的闭区间
2. **XNXQDM** 的值,2025-2026-2指25到26年的第二学期，按需改
注: 比如保存为fetch_kb.sh后先后执行
```bash
chmod +x fetch_kb.sh
./fetch_kb.sh
```

```bash
#!/bin/bash

# 配置区间
START=250200001
END=250200002
SAVE_DIR="./kb_json_files"

mkdir -p $SAVE_DIR

for (( xh=$START; xh<=$END; xh++ ))
do
    echo "Processing XH: $xh ..."
    
    # 构建 JSON 参数
    JSON_DATA="{\"*order\":\"+SKXQ,+KSJC,+JSJC\",\"XNXQDM\":\"2025-2026-2\",\"XH\":\"$xh\"}"
    
    # 调用 CURL 并保存
    curl -s -k "https://jwxt.szpu.edu.cn/jwapp/sys/kcbcxmdl/KbcxController/queryxskb.do" \
    -X POST \
    -H "Content-Type: application/x-www-form-urlencoded; charset=UTF-8" \
    -H "X-Requested-With: XMLHttpRequest" \
    --data-urlencode "requestParamStr=$JSON_DATA" \
    -o "$SAVE_DIR/$xh.json"

    # 打印简要结果
    if [ $? -eq 0 ]; then
        echo "Saved to $SAVE_DIR/$xh.json"
    else
        echo "Failed to fetch $xh"
    fi

    sleep 1
done
```

### 0.3 js fetch
在任意一个控制台或者保存为js来执行,记得 **XNXQDM** 和 **XH** ,0.1说过一遍了
range就自己改，设个异步任务循环就好了

```javascript
(() => {
  fetch("https://jwxt.szpu.edu.cn/jwapp/sys/kcbcxmdl/KbcxController/queryxskb.do", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json, text/javascript, */*; q=0.01",
    },
    body: new URLSearchParams({
      requestParamStr: JSON.stringify({
        "*order": "+SKXQ,+KSJC,+JSJC",
        XNXQDM: "2025-2026-2", //格式长这样,别改错了,~到~学年的第~学期
        XH: "你的学号"
      })
    })
  })
  .then(r => r.json())
  .then(data => {
    console.log(data);
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json; charset=utf-8' });
      const downloadUrl = URL.createObjectURL(blob);
      const aTag = document.createElement('a');
      aTag.href = downloadUrl;
      aTag.download = `课表_${new Date().getFullYear()}${new Date().getMonth()+1}${new Date().getDate()}.json`;
      document.body.appendChild(aTag);
      aTag.click();
      document.body.removeChild(aTag);
      URL.revokeObjectURL(downloadUrl);
      console.log('课表JSON文件已成功下载！');
    } catch (error) {
      console.error('下载JSON文件失败：', error);
    }
  })
  .catch(console.error);
})();
```

## 看啥呢，下面没东西了QwQ
