"use strict";

function getblobUrl(content) {
  const _MIME_TYPE = 'text/plain';
  const _UTF8_BOM = '\uFEFF';
  const blob = new Blob([_UTF8_BOM + content], {
    type: _MIME_TYPE
  });
  return window.URL.createObjectURL(blob);
}

function getDateTime() {
  const _DATE = new Date();
  const DATE_TIME = String(_DATE.getFullYear() + fixOneDigit((_DATE.getMonth() + 1)) + fixOneDigit(_DATE.getDate()) + "_" + fixOneDigit(_DATE.getHours()) + fixOneDigit(_DATE.getMinutes()) + fixOneDigit(_DATE.getSeconds()));
  return DATE_TIME;
}

function fixOneDigit(x) {
  return x < 10 ? ("0" + x) : x;
}

function descriptionCleaner(string) {
  return string
    .toString()
    .trim();
}

function removeTZ(input) {
  return input.replace(/TZID.*:/, "");
}
var monthName = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];
function dateFormat(date) {
  var type = document.getElementById("dateFormat").value;
  var dateGood ="";
  var ampm;
  let year = date.slice(0, 4);
  let month = date.slice(4, 6);
  let day = date.slice(6, 8);
  let hour = date.slice(9, 11);
  let minute = date.slice(11, 13);
  let second = date.slice(13, 15);
  if (type == 1) {
    dateGood = date;
  } else if (type == 2) {
    dateGood = month + "/" + day + "/" + year + " " + hour + ":" + minute + ":" + second;
  } else if (type == 3) {
    if (hour > 12) {
      ampm = "PM"
    } else {
      ampm = "AM"
    }
    dateGood = monthName[parseInt(parseInt(month,10)-1, 10)].slice(0, 3) + " " + day + " " + year + " " + (hour % 12) + ":" + minute + ampm;
  } else if (type == 4) {
    if (hour > 12) {
      ampm = "PM"
    } else {
      ampm = "AM"
    }
    try {
      dateGood = monthName[parseInt(parseInt(month,10), 10)] + " " + day + " " + year + " " + (hour % 12) + ":" + minute + ampm;
    }
    catch(error){
      console.log(error + " : " + date);
    }

  } else if (type == 5) {
    dateGood = year + "-" + month + "-" + day + "T" + hour + ":" + minute + ":" + second;
  }
  return dateGood;
}

let eventRecords = [];
const MAX_SHOW_RECORD = 10;


const KEY_WORDS = {
  WORDS: ['BEGIN:VEVENT', 'DTSTART', 'DTEND', 'DESCRIPTION', 'SUMMARY', 'LOCATION', 'END:VEVENT'],
  SUBSTRING: [0, 8, 6, 12, 8, 9, 0]
};


class EventRecord {
  constructor(start, end, title, location, more) {
    this.start = start.trim();
    this.end = end.trim();
    this.title = title.trim().replace(/\\,/g, '，');
    this.location = location.trim().replace(/\\,/g, '，');
    this.more = more.trim().replace(/\\,/g, '，');
  }
}

$(document).on('change', ':file', function() {
    var input = $(this);
    $('#selectedFile').val(input[0].files[0].name);
});

var INPUT_FILE;
$(function() {
  $('#input_file').change(function(e) {
    $('#div_download').empty();
    $('#div_result_file_name').empty();
    $('#div_result_table').empty();
    INPUT_FILE = e.target.files[0];
    if (INPUT_FILE === null) {
      return;
    }
    $('#div_result_file_name').append('Selected File: ' + INPUT_FILE.name);
    let fileReader = new FileReader();
    fileReader.readAsText(INPUT_FILE);
    fileReader.onload = function() {
      eventRecords = [];
      parse(fileReader.result.split('\n'));
      sortResult();
      printResult();
      createDownloadableContent();
    };
  });
});

$(function() {
  $('#dateFormat').change(function() {
    $('#div_download').empty();
    $('#div_result_table').empty();
    let fileReader = new FileReader();
    fileReader.readAsText(INPUT_FILE);
    fileReader.onload = function() {
      eventRecords = [];
      parse(fileReader.result.split('\n'));
      sortResult();
      printResult();
      createDownloadableContent();
    };
  });
});

function parse(input) {
  var _keywordIndex = 0;
  let tempArray = [];
  var descriptionArray = [];
  for (var i = 0; i < input.length; i++) {
    if (input[i].match('^' + KEY_WORDS.WORDS[_keywordIndex])) {
      if (_keywordIndex != 3) {
        tempArray[_keywordIndex] = input[i].substring(KEY_WORDS.SUBSTRING[_keywordIndex]);
        _keywordIndex++;
      } else {
        for (;;) {
          if (input[i].match('^DESCRIPTION:')) {
            descriptionArray.push(descriptionCleaner(input[i].substring(12)));
            i++;
            continue;
          }
          if (input[i].match('^LAST-MODIFIED')) {
            break;
          }
          descriptionArray.push(descriptionCleaner(input[i]));
          i++;
        }
        if (descriptionArray.length != 0) {
          tempArray[_keywordIndex] = descriptionArray.join('');
        }
        _keywordIndex++;
        descriptionArray = [];
      }
    }

    if (_keywordIndex === KEY_WORDS.WORDS.length) {
      handleEventRecord(tempArray);
      _keywordIndex = 0;
      tempArray = [];
    }
  }
}

function handleEventRecord(arr) {
  if (arr[1].match('^VALUE')) {
    arr[1] = arr[1].substring(11);
  }
  if (arr[2].match('^VALUE')) {
    arr[2] = arr[2].substring(11);
  }
  if (arr[1].includes('TZID')) {
    arr[1] = removeTZ(arr[1]);
  }
  if (arr[2].includes('TZID')) {
    arr[2] = removeTZ(arr[1]);
  }
  arr[1] = dateFormat(arr[1]);
  arr[2] = dateFormat(arr[2]);
  eventRecords.push(new EventRecord(arr[1], arr[2], arr[4], arr[5], arr[3]));
}


function sortResult() {
  eventRecords.sort(function(a, b) {
    return a.start.substr(0, 8) - b.start.substr(0, 8);
  });
}

function printResult() {
  let str = '';
  str += '<table id="table_result" class="class="d-flex table table-dark">';
  str += '<caption>CSV preview</caption>'
  str += '<thead>';
  str += '<tr>';
  str += '<th scope="col">Start Date/Time</th>';
  str += '<th scope="col">End Date/Time</th>';
  str += '<th scope="col">Title</th>';
  str += '<th scope="col">Location</th>';
  str += '<th scope="col">Details</th>';
  str += '</tr></thead>';
  $("#div_result_table").append(str);
  const _printLength = eventRecords.length > MAX_SHOW_RECORD ? MAX_SHOW_RECORD : eventRecords.length;
  for (let i = 0; i < _printLength; i++) {
    let str = '';
    str += '<tr class="class="d-flex">';
    str += '<td>' + eventRecords[i].start + '</td>';
    str += '<td>' + eventRecords[i].end + '</td>';
    str += '<td>' + eventRecords[i].title + '</td>';
    str += '<td>' + eventRecords[i].location + '</td>';
    str += '<td>' + eventRecords[i].more + '</td>';
    str += '</tr>';
    $("#table_result").append(str);
  }
}

function createDownloadableContent() {
  let content = '#,Start Date,End Date,Title,Location,Details,\n';
  for (let i = 0; i < eventRecords.length; i++) {
    content += i + 1 + ',';
    content += eventRecords[i].start + ',';
    content += eventRecords[i].end + ',';
    content += eventRecords[i].title + ',';
    content += eventRecords[i].location + ',';
    content += eventRecords[i].more + ',';
    content += '\n';
  }

  const fileName = 'Google_calendar' + getDateTime() + '.csv';
  const buttonDownload = '<a ' +
    'id="button_download" ' +
    'class="btn btn-block btn-outline-secondary spaced" ' +
    'href="' + getblobUrl(content) + '" ' +
    'download="' + fileName + '" ' +
    '>Download CSV</a>';
  $("#div_download").append(buttonDownload);
}
