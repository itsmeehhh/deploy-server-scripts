const fs = require('fs');
const child_process = require('child_process');
const express = require('express');
const app = express();
const fetch = require('node-fetch');
const folderName = 'database';
const children = {};
function runFile(file) {
  const filePath = `./${folderName}/${file}`;
  const child = child_process.spawn('node', [filePath]);
  child.stdout.on('data', (data) => {
    console.log(data.toString());
  });
  child.stderr.on('data', (data) => {
 console.error(data.toString());
  });
  child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
  children[file] = child;
}
function stopFile(file) {
  const child = children[file];
  if (child) {
    child.kill();
  }
  delete children[file];
}
fs.readdir(folderName, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }
  files.forEach(runFile);
});
fs.watch(folderName, (eventType, filename) => {
  if (eventType === 'rename') {
fs.access(`./${folderName}/${filename}`, (err) => {
      if (err) {
        console.log(`File ${filename} was deleted`);
        stopFile(filename);
      } else {
        console.log(`File ${filename} was added`);
        runFile(filename);
      }
    });
  }
});

//test webs

//اضافة مستخدم الى القاعدة 
app.get("/adduser", async (req, res) => {
  if (req.query.token && req.query.owner && req.query.repo) {
    const checkResponse = await fetch(
      `https://api.github.com/repos/${req.query.owner}/${req.query.repo}`,
      {
        headers: {
          Authorization: `token ${req.query.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    if (checkResponse.status === 200) {
      const fileName = `${req.query.repo}&${req.query.owner}.js`;
      fs.access(`./myapp/${fileName}`, fs.constants.F_OK, (err) => {
        if (err) {
          // file does not exist
          fs.readFile("./data.txt", "utf8", (err, data) => {
            if (err) {
              res.send("حدث خطأ ما، أعد المحاولة لاحقا ❌\n\ndevloper page: MoroccoAI");
            } else {
              // replace the hard-coded values with the received values
              data = data.replace(
                /"TOKEN-RESULT"/g,
                `"${req.query.token}"`
              );
              data = data.replace(/"OWNER-RESULT"/g, `"${req.query.owner}"`);
              data = data.replace(/"REPO-RESULT"/g, `"${req.query.repo}"`);
              // save the new file in myapp folder
              fs.writeFile(`./myapp/${fileName}`, data, (err) => {
                if (err) {
                  res.send("حدث خطأ ما، أعد المحاولة لاحقا ❌\n\ndevloper page: MoroccoAI");
                } else {
                  res.send("يتم إنشاء الملف الجديد في مجلد myapp ⏳\nيمكنك الاطلاع عليه وتعديله كما تشاء 🙃\n\ndevloper page: MoroccoAI");
                }
              });
            }
          });
        } else {
          // file exists
          res.send("هذا الملف موجود بالفعل في مجلد myapp ❌\nإذا كنت تريد إنشاء ملف جديد، قم بتغيير اسم المالك أو المستودع أو كلاهما \n\ndevloper page: MoroccoAI");
        }
      });
    } else {
      res.send(`المعلومات غير صحيحة ❌ \nقم بالتأكد من إدخال بيانات صحيحة 😤\n\n -تأكد من أن github token الخاص بك صالح وتأكد من منحه جميع الصلاحيات\n -تأكد من ادخال user name او repo name بشكل صحيح\n -أو اذا كانت المعلومات صحيحة بالفعل أعد المحاولة\n\ndevloper page: MoroccoAI`);
    }
  } else {
    res.send("يرجى ملأ كل الحقول ❌\n\ndevloper page: MoroccoAI");
  }
});


//حذف المستخدم من القاعدة
app.get("/deleteuser", async (req, res) => {
  if (
    req.query.token && 
    req.query.owner && 
    req.query.repo
  ) {
    // يرسل طلبًا إلى api.github.com للحصول على معلومات عن مالك ومستودع معينين
    const checkResponse = await fetch(
      `https://api.github.com/repos/${req.query.owner}/${req.query.repo}`,
      {
        headers: {
          Authorization: `token ${req.query.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    if (checkResponse.status === 200) {
      //دالة لالغاء جميع اتصلات action لو تم حذف المستخدم من قاعدة البيانات 

      const getRepoResponse = await fetch(
        `https://api.github.com/repos/${req.query.owner}/${req.query.repo}`,
        {
          headers: {
            Authorization: `token ${req.query.token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      const getRepoData = await getRepoResponse.json()
      const branch = getRepoData.default_branch;

      const getWorkflowsResponse = await fetch(
        `https://api.github.com/repos/${req.query.owner}/${req.query.repo}/actions/runs?branch=${branch}`,
        {
          headers: {
            Authorization: `token ${req.query.token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      const getWorkflowsData = await getWorkflowsResponse.json();
      const workflows = getWorkflowsData.workflow_runs;

      workflows.forEach(async (workflow) => {
        const runId = workflow.id;
        const cancelRunResponse = await fetch(
          `https://api.github.com/repos/${req.query.owner}/${req.query.repo}/actions/runs/${runId}/cancel`,
          {
            method: "POST",
            headers: {
              Authorization: `token ${req.query.token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        const cancelRunData = await cancelRunResponse.json();
      });
      //دالة لحذف ملف yml من repo
      const getFileResponse = await fetch(
        `https://api.github.com/repos/${req.query.owner}/${req.query.repo}/contents/.github/workflows/my.yml`,
        {
          headers: {
            Authorization: `token ${req.query.token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      const getFileData = await getFileResponse.json();
      const sha = getFileData.sha;
      const deleteFileResponse = await fetch(
        `https://api.github.com/repos/${req.query.owner}/${req.query.repo}/contents/.github/workflows/my.yml`,
        {
          method: "DELETE",
          headers: {
            Authorization: `token ${req.query.token}`,
            Accept: "application/vnd.github.v3+json",
          },
          body: JSON.stringify({
            message: "Server Disconnected ✅",
            sha,
          }),
        }
      );
      const deleteFileData = await deleteFileResponse.json();
      console.log(`${req.query.owner}/${req.query.repo} Server Deleted`);
      // يحصل على اسم الملف الذي يحتوي على الكود الخاص بالمستخدم
      const fileName = `${req.query.repo}&${req.query.owner}.js`;
      // يحصل على مسار الملف الذي يحتوي على الكود الخاص بالمستخدم
      const filePath = `myapp/${fileName}`;
      // يتحقق من وجود الملف
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          // إذا لم يكن الملف موجودا ، يعرض رسالة تفيد بذلك
          res.send("لم يتم العثور على الملف الذي يحتوي على الكود الخاص بالمستخدم ❌\n\ndevloper page: MoroccoAI");
        } else {
          // إذا كان الملف موجودا ، يقوم بحذفه
          fs.unlink(filePath, (err) => {
            if (err) {
              // إذا حدث خطأ في حذف الملف ، يعرض رسالة تفيد بذلك
              res.send("حدث خطأ ما في حذف الملف الذي يحتوي على الكود الخاص بالمستخدم ❌\n\ndevloper page: MoroccoAI");
            } else {
              // إذا تم حذف الملف بنجاح ، يعرض رسالة تفيد بذلك
              res.send("تم حذف الملف الذي يحتوي على الكود الخاص بالمستخدم بنجاح ✅\n\ndevloper page: MoroccoAI");
            }
          });
        }
      });
    } else {
      res.send(`المعلومات غير صحيحة ❌ \nقم بالتأكد من إدخال بيانات صحيحة 😤\n\n -تأكد من أن github token الخاص بك صالح وتأكد من منحه جميع الصلاحيات\n -تأكد من ادخال user name او repo name بشكل صحيح\n -أو اذا كانت المعلومات صحيحة بالفعل أعد المحاولة\n\ndevloper page: MoroccoAI`);
    }
  } else {
    res.send("يرجى ملأ كل الحقول ❌\n\ndevloper page: MoroccoAI");
  }
});

// الفيديو التعليمي GitHub token 
app.get("/tutorialtoken", (req, res) => {
  res.sendFile(__dirname + "/tutorialtoken.mp4");
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
app.listen(8080, () => {
  console.log("Server running on port 8080");
});