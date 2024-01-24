const fs = require('fs');
const child_process = require('child_process');
const express = require('express');
const app = express();
const fetch = require('node-fetch');
const path = require('path');

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

//add users
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
      fs.access(`./database/${fileName}`, fs.constants.F_OK, (err) => {
        if (err) {
          // file does not exist
          fs.readFile("./data.txt", "utf8", (err, data) => {
            if (err) {
              res.send("حدث خطأ ما، أعد المحاولة لاحقا ❌\n\ndevloper page: MoroccoAI");
            } else {
              // replace values
              data = data.replace(
                /"TOKEN-RESULT"/g,
                `"${req.query.token}"`
              );
              data = data.replace(/"OWNER-RESULT"/g, `"${req.query.owner}"`);
              data = data.replace(/"REPO-RESULT"/g, `"${req.query.repo}"`);
              // save the new file in myapp folder
              fs.writeFile(`./database/${fileName}`, data, (err) => {
                if (err) {
                  res.send("حدث خطأ ما، أعد المحاولة لاحقا ❌\n\ndevloper page: MoroccoAI");
                } else {
                  res.send("يتم نشر المشروع الخاص بك في السرفر ✅ \n يمكنك الخروج و الانتظار لمدة 2/5 دقائق حتى يتم تشغيله ، استمتع بوقتك 🤠\n\ndevloper page: MoroccoAI");
                }
              });
            }
          });
        } else {
          // file exists
          res.send("هذا المستودع موجود مسبقا مما يعني انه شغال ❌\nلو كان هناك مشكلة في تشغيل المستودع، قم بعمل stop deploy ثم start deploy لكي يتم الرفع من جديد\n\ndevloper page: MoroccoAI");
        }
      });
    } else {
      res.send(`المعلومات غير صحيحة ❌ \nقم بالتأكد من إدخال بيانات صحيحة 😤\n\n -تأكد من أن github token الخاص بك صالح وتأكد من منحه جميع الصلاحيات\n -تأكد من ادخال user name او repo name بشكل صحيح\n -أو اذا كانت المعلومات صحيحة بالفعل أعد المحاولة\n\ndevloper page: MoroccoAI`);
    }
  } else {
    res.send("يرجى ملأ كل الحقول ❌\n\ndevloper page: MoroccoAI");
  }
});


//delete user
app.get("/deleteuser", async (req, res) => {
  if (
    req.query.token && 
    req.query.owner && 
    req.query.repo
  ) {
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
      //delet and cancel all actions
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
      //delete yml file
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
      const fileName = `${req.query.repo}&${req.query.owner}.js`;
      const filePath = `database/${fileName}`;
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          res.send("انت لم تقم برفع المشروع اصلا لالغاء نشره او انك قمت بالغاء النشر سابقا ❌\n\ndevloper page: MoroccoAI");
        } else {
          fs.unlink(filePath, (err) => {
            if (err) {
              res.send("حدث خطا ما، يرجى اعادة المحاولة ❌\n\ndevloper page: MoroccoAI");
            } else {
              res.send("تم الغاء النشر بنجاح ✅\n\ndevloper page: MoroccoAI");
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

// GitHub token tutorial 
app.get("/tutorialtoken", (req, res) => {
  res.sendFile(__dirname + "/tutorialtoken.mp4");
});

app.get("/deploy-page", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index2.html");
});

//قراءة محتوى database
app.get('/deploy-datas', (req, res) => {
  fs.readdir('database', (err, files) => {
    if (err) {
      res.status(500).send('حدث خطأ في قراءة المجلد');
    } else {
      let list = '<ul>';
      for (let file of files) {
        list += `<li><a href="/deploy-datas/${file}" style="font-size: 30px;">${file}</a></li>`;
        }
        list += '</ul>';
        res.send(list);
    }
  });
});
app.get('/deploy-datas/:filename', (req, res) => {
  let filename = req.params.filename;
fs.readFile(`database/${filename}`, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('حدث خطأ في قراءة الملف');
    } else {
      res.send(data);
    }
  });
});

app.listen(8080, () => {
  console.log("Server running on port 8080");
});