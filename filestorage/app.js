const express = require("express")
const bodyParser = require("body-parser")
var cors = require("cors")
const xl = require("excel4node")
const fs = require("fs")
const fsp = fs.promises

const app = express()
app.use(bodyParser.json())
app.use(cors())
app.use(express.static("../video"))

function invalidRequest(res, err) {
  console.error(err)
  res.status(500).end()
}

const translation = {
  "exercise": "Cvik",
  "repeat": "Opakování",
  "comment": "Slovní komentář",
  "okay": "Správně",
  "corner": "Koutek úst nejde dost vysoko",
  "-corner": "Koutek úst nejde dost dolů",
  "corner_still": "Zapojuje se druhý koutek",
  "open": "Ústa jsou málo otevřená",
  "-open": "Ústa jsou otevřená",
  "width": "Úsměv je málo široký",
  "teeth": "Zuby zůstávají skousnuté",
  "square": "Rty netvoří kruh",
  "tongue_up": "Jazyk jde málo nahoru",
  "tongue_down": "Jazyk jde málo dolů",
  "tongue_left": "Jazyk jde málo doleva (z pohledu kamery)",
  "tongue_right": "Jazyk jde málo doprava (z pohledu kamery)",
  "brightness": "Tvář není dostatečně vyboulená",
  "symm": "Není symetrické",
  "two_symm": "Není symetrické na jednu a druhou stranu",
  "head": "Hýbe se hlava",
  "neck": "Zapojují se krční svaly",
  "lips_open": "Rty nejsou v kontaktu",
  "jaw": "Zapojuje se čelist",
  "tongue_shape": "Jazyk není v protažení",
  "lips_move": "Zapojují se rty",
  "-teeth": "Zuby nejsou v lehkém kontaktu",
  "tongue_still": "Není správná klidová poloha jazyka",
  "chin": "Zapojuje se bradový sval",
}

function spreadsheet() {
  // Create a new instance of a Workbook class
  var wb = new xl.Workbook();

  wb.worksheets = new Map()
  wb.sheet = function(name) {
    name = String(name)
    let ws = wb.worksheets.get(name)
    if (!ws) {
      ws = wb.addWorksheet(name)
      wb.worksheets.set(name, ws)
      ws.lines = 1
      ws.header = ["exercise", "repeat", "comment"]
      ws.addLine = function(name, data) {
        const regex = /(.*)_(.)/
        ws.cell(++ws.lines, 1).string(name)
        for (let i=0; i<3; i++) {
          ws.cell(ws.lines + i, 2).number(i + 1)
        }
        for (const entry in data) {
          try {
            const [_, aspect, repeat] = entry.match(regex)
            let column = ws.header.indexOf(aspect) + 1
            if (!column) {
              column = ws.header.push(aspect)
              ws.cell(1, column).string(translation[aspect])
            }
            ws.cell(ws.lines + Number(repeat), column).number(Number(data[entry]))
          } catch (err) {
            let column = ws.header.indexOf(entry) + 1
	    if (column > 0) {
	      ws.cell(ws.lines, column).string(String(data[entry]))
	    }
          }
        }
        ws.lines += 2
      }
    }
    return ws
  }

  wb.add = function(data) {
    const regex = /(.)_(.*)\.mp4/
    for (const filename in data) {
      if (filename === "subjects" || filename.startsWith("prologue-")) {
        continue
      }
      const [_, person, exercise] = filename.match(regex)
      const ws = wb.sheet(person)
      ws.addLine(exercise, data[filename])
    }
  }

  return wb
}

app.get("/", (req, res) => {
  res.sendFile("/home/addam/src/morec/video/index.html")
})

const datadir = "./data"

app.get("/combined.xlsx", async (req, res) => {
  try {
    const wb = spreadsheet()
    for await (const name of await fsp.readdir(datadir)) {
      const data = JSON.parse(await fsp.readFile(`${datadir}/${name}`))
      wb.add(data)
    }
    wb.write("combined.xlsx", res)
  } catch (err) {
    console.error(err)
    invalidRequest(res, err)
  }
});

app.get("/files.html", async (req, res) => {
  try {
    const result = []
    for await (const name of await fsp.readdir(datadir)) {
      result.push(name)
    }
    res.status(200).send(result.join("<br>"))
  } catch (err) {
    console.error(err)
    invalidRequest(res, err)
  }
});

app.post("/", async (req, res) => {
  try {
    console.log(new Date(), req.ip, req.body.subjects)
    const name = `${req.body.subjects.substring(1)}_${(new Date()).toISOString()}.json`
    await fsp.writeFile(`${datadir}/${name}`, JSON.stringify(req.body))
    res.status(200).end()
  } catch (err) {
    invalidRequest(res, err)
  }
});

var port = process.env.PORT || 3000
app.listen(port, "localhost")
console.log(`Server running on http://localhost:${port}`)


