const fs = require('fs');
const child_process = require('child_process');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const fileUpload = require('express-fileupload');
const io = require('socket.io')(server);
const path = require('path');
const { exec } = require('child_process');
const folderName = 'database';
const children = {};
const logs = {};

app.use(express.static(path.join(__dirname, 'views')));

io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('requestLogs', (filename) => {
    socket.emit('logs', logs[filename]);
  });
});

function runFile(file) {
  const filePath = `./${folderName}/${file}`;
  const child = child_process.spawn('node', [filePath]);
  logs[file] = [];
  child.stdout.on('data', (data) => {
    const message = data.toString();
    if (!logs[file]) {
      logs[file] = [];
    }
    logs[file].push(message);
    io.emit('newLog', { file, message });
  });
  child.stderr.on('data', (data) => {
    const message = data.toString();
    if (!logs[file]) {
      logs[file] = [];
    }
    console.error(`${file} : Code error, see logs for more`);
    logs[file].push(message);
    io.emit('newLog', { file, message });
    if (message.includes('Cannot find module')) {
      const moduleName = message.match(/'([^']+)'/)[1];
      stopFile(file);
      installModule(moduleName, () => {
        runFile(file);
      });
    }
  });
  child.on('close', (code) => {
    console.log(`${file}: exited with code ${code}`);
    io.emit('newLog', { file, message: `Process exited with code ${code}` });
  });
  children[file] = child;
}

function stopFile(file) {
  const child = children[file];
  if (child) {
    child.kill('SIGINT');
  }
  delete children[file];
  delete logs[file];
}
// وظيفة لحذف كل السجلات كل 5 دقائق
setInterval(() => {
  Object.keys(logs).forEach((file) => {
    delete logs[file];
  });
  console.log('جميع السجلات تم حذفها');
}, 300000);

function installModule(moduleName, callback) {
  exec(`npm install ${moduleName}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error installing module ${moduleName}: ${stderr}`);
      return;
    }
    console.log(`Module ${moduleName} installed successfully: ${stdout}`);
    callback();
  });
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
            branch: getRepoData.default_branch,
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
// حفظ كود الى مجلد database 
app.get('/save', (req, res) => {
  const text = req.query.text;
  const filename = req.query.filename;
  const filePath = `./database/${filename}.js`;
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      fs.writeFile(filePath, text, (writeErr) => {
        if (writeErr) {
          console.error(writeErr);
          res.send('حدث خطأ أثناء رفع الكود ، حاول مجددا! ');
        } else {
          res.send('تم رفع الكود الى قاعدة البيانات بنجاح ✅.');
        }
      });
    } else {
      res.send('حاول استخدام إسم مختلف لأن هذا الاسم موجود بالفعل في قاعدة البيانات!');
    }
  });
});

// GitHub token tutorial 
app.get("/tutorialtoken", (req, res) => {
  res.sendFile(__dirname + "/tutorialtoken.mp4");
});

//الصفحات الاساسية
app.get("/deploy-page", (req, res) => {
  res.sendFile(__dirname + "/views/index2.html");
});
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
app.get("/deploy-code", (req, res) => {
  res.sendFile(__dirname + "/views/indexsave.html");
});
//قراءة محتوى database
app.get('/deploy-datas', (req, res) => {
  fs.readdir('database', (err, files) => {
    if (err) {
      res.status(500).send('حدث خطأ في قراءة المجلد');
    } else {
      let list = '<ul style="list-style-type: none;">';
      for (let file of files) {
        list += `<li style="margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
                   <div style="float: right;">${file}</div>
                   <div style="float: left;">
                     <a href="/deploy-datas/${file}" style="font-size: 20px; text-decoration: underline;">view</a> |
                     <a href="/viewlogs/${file}" style="font-size: 20px; text-decoration: underline; margin-left: 10px; background-color: #f0f0f0; padding: 5px;">viewlogs</a> |
                     <form action="/delete-file/${file}" method="get" onsubmit="return confirm('هل أنت متأكد من أنك تريد حذف الملف ${file} من قاعدة البيانات؟');" style="display: inline;">
                       <button type="submit" style="font-size: 20px; color: red; background: none; border: none; padding: 0; cursor: pointer; text-decoration: underline;">delete</button>
                     </form>
                   </div>
                   <div style="clear: both;"></div>
                 </li>`;
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
// حذف الملف من database
app.get('/delete-file/:filename', (req, res) => {
  let filename = req.params.filename;
  fs.unlink(`database/${filename}`, (err) => {
    if (err) {
      res.status(500).send('حدث خطأ في حذف الملف');
    } else {
      res.redirect('/deploy-datas');
    }
  });
});
//viewlogs 
app.get('/viewlogs/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, folderName, filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>الملف غير موجود</title>
          <style>
            body {
              height: 100vh;
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              background-color: #000;
              color: #fff;
              font-family: 'Courier New', Courier, monospace;
            }
          </style>
        </head>
        <body>
          <h1>لا يمكن عرض السجلات لان الملف غير موجود اصلا</h1>
        </body>
        </html>
      `);
    }
    res.sendFile(path.join(__dirname, './views/viewhelper.html'));
  });
});
//deletelogs
app.get('/viewlogs/:filename/delete', (req, res) => {
  const filename = req.params.filename;
  if (logs[filename]) {
    delete logs[filename];
    res.send(`سجلات الملف ${filename} تم حذفها بنجاح`);
  } else {
    res.status(404).send(`الملف ${filename} غير موجود أو لا توجد له سجلات`);
  }
});
//حفظ ملف الى مجلد database 
app.use(fileUpload());
app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('لم يتم تحميل أي ملف.');
  }
  let uploadedFile = req.files.file;
  if (uploadedFile.name.endsWith('.js')) {
    let filename = req.body.filename || uploadedFile.name;
    let savePath = path.join(__dirname, 'database', filename);

    uploadedFile.mv(savePath, (err) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.send('تم تحميل الملف بنجاح.');
    });
  } else {
    res.status(400).send('يمكن رفع الملفات بصيغة .js فقط.');
  }
});

//ارجاع المستخدم الى الصفحة الرئيسية اذا كان الخادم غير موجود
app.get('*', (req, res) => {
  res.redirect('/');
});
server.listen(8080, () => {
  console.log('Server is running on port 8080');
});