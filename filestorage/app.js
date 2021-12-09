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
  "subject": "Subjekt",
  "exercise": "Cvik",
  "repeat": "Opakování",
  "filename": "Odevzdaný soubor",
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

function getDefault(map, key, type=Map) {
  return map.get(key) || (map.set(key, new type()).get(key))
}

function forEachSorted(map, callback) {
  const array = Array.from(map.entries()).sort(([ak, av], [bk, bv]) => (ak < bk) ? -1 : (bk < ak) ? 1 : 0)
  array.forEach(([k, v]) => callback(v, k))
}

function columnName(index) {
  if (index > 26) {
    return columnName(1 + Math.floor((index - 1) / 26)) + columnName((index - 1) % 26 + 1)
  }
  return String.fromCharCode(65 + index)
}

class Dataset {
  constructor() {
    // data[person][exercise][repeat][fileNo] = {aspect: value, ...}
    this.data = new Map()
    this.header = new Set()
    this.fixedHeader = [null, "exercise", "repeat", "filename", "comment"]
  }

  add(dataset, id) {
    for (const filename in dataset) {
      if (filename === "subjects" || filename.startsWith("prologue-")) {
        continue
      }
      const [_, person, exercise] = filename.match(/(.)_(.*)\.mp4/)
      const personData = getDefault(this.data, person)
      const exerciseData = getDefault(personData, exercise)
      for (const aspectName in dataset[filename]) {
        const [_, aspect, repeat] = aspectName.match(/(.*)_(.)/) || [null, aspectName, 0]
        const repeatData = getDefault(exerciseData, Number(repeat))
        const rowData = getDefault(repeatData, id)
        rowData.set(aspect, dataset[filename][aspectName])
        this.header.add(aspect)
      }
    }
  }

  write(filename, res) {
    const wb = new xl.Workbook()
    const markStyle = wb.createStyle({
      font: {
        bold: true,
        color: "FF0000",
      },
    });

    forEachSorted(this.data, (personData, person) => {
      const ws = wb.addWorksheet(person)
      const header = [...this.fixedHeader, ...this.header]
      header.forEach((name, i) => {
        if (i) {
          ws.cell(1, i).string(translation[name])
        }
      })
      let row = 2
      forEachSorted(personData, (exerciseData, exercise) => {
        exerciseData.forEach((repeatData, repeat) => {
          repeatData.forEach((rowData, filename) => {
            ws.cell(row, 1).string(exercise)
            ws.cell(row, header.indexOf("repeat")).number(repeat)
            ws.cell(row, header.indexOf("filename")).string(filename)
            forEachSorted(rowData, (value, aspect) => {
              const column = header.indexOf(aspect)
              if (typeof value === "string") {
                ws.cell(row, column).string(value)
              } else {
                ws.cell(row, column).number(Number(value))
              }
            })
            row += 1
          })
        })
      })
      ws.addConditionalFormattingRule(`E2:E${row}`, {
        type: "expression",
        priority: 1,
        formula: "1-E2",
        style: markStyle,
      })
      const lastColumn = columnName(header.length)
      ws.addConditionalFormattingRule(`F2:${lastColumn}${row}`, {
        type: "expression",
        priority: 1,
        formula: "F2",
        style: markStyle,
      });
    })
    return wb.write(filename, res)
  }

  flipExercisePerson() {
    const orig = this.data
    this.data = new Map()
    orig.forEach((personOrig, person) => {
      personOrig.forEach((exerciseOrig, exercise) => {
        const exerciseData = getDefault(this.data, exercise)
        exerciseData.set(person, exerciseOrig)
      })
    })
    this.fixedHeader[1] = "subject"
  }
}

app.get("/", (req, res) => {
  res.sendFile("/home/addam/src/morec/video/index.html")
})

const datadir = "./data"

async function fillDataset() {
  const wb = new Dataset()
  for await (const name of await fsp.readdir(datadir)) {
    try {
      const data = JSON.parse(await fsp.readFile(`${datadir}/${name}`))
      wb.add(data, name)
    } catch (e) {
      console.warn(`Failed to read file ${datadir}/${name}`)
    }
  }
  return wb;
}

app.get("/combined.xlsx", async (req, res) => {
  try {
    const wb = await fillDataset()
    wb.write("combined.xlsx", res)
  } catch (err) {
    console.error(err)
    invalidRequest(res, err)
  }
});

app.get("/exercises.xlsx", async (req, res) => {
  try {
    const wb = await fillDataset()
    wb.flipExercisePerson()
    wb.write("exercises.xlsx", res)
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


