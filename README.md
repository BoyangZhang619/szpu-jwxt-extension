# SZPU教务课表获取

## 0. 快速使用

在网站 **https://jwxt.szpu.edu.cn/jwapp/** 下的控制台执行下面这个脚本就能下载了,记得改学期和学号以及开vpn进校网站,运行后会下下来一个json文件,然后你就 ***不用再往下看了***

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

## 1. 呃

考虑到上面那个 **IIFE** 已经完成了所有的事情,所以这个浏览器扩展想配置的和想看的就找AI问去吧,我有点懒,不写了
