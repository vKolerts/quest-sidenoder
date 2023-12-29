/* global search,sortElements */
/*eslint no-unused-vars: ["error", {
  "varsIgnorePattern": "addBookmark|delBookmark|getDirSize|install|oculusInfo|sortFiles|sqInfo|steamInfo"
}]*/
const fs = require("fs").promises;
const path = require("path");

console.log("ONLOAD BROWSE");

let BROWSE_HISTORY = {};
let upDir = () => getDir();

ipcRenderer.on("get_dir", (event, arg) => {
  console.log("get_dir msg came: ", arg.path, arg.list.length);
  if (arg.success) {
    setLocation(arg.path);
    loadDir(arg.list);
    fixIcons();
  }
  $id("processingModal").modal("hide");
  search && search.update();
});

function setLocation(loc) {
  upDir = () => getDir(path.dirname(loc));
  id("path").title = loc;

  resizeLoc();
}

function addBookmark(name, path, write_cfg = true) {
  // console.log('addBookmark', { name, path, write_cfg });
  if (!name) {
    return alert("Bookmark name can`t be empty");
  }
  const i = $(".dir-bookmark").length;
  id("bookmarksdropdown").innerHTML += `<div class="dropdown-item">
    <a class="dir-bookmark" onclick="getDir('${path}');$id('bookmarksdropdown').toggle()">
    <i class="fa fa-star-o"></i> ${name}</a>
    <a class="pull-right text-danger" data-i="${i}" onclick="delBookmark(this)"> x</a>
  </div>`;
  if (write_cfg) {
    const bookmarks = remote.getGlobal("currentConfiguration").dirBookmarks;
    bookmarks.push({ name, path });
    ipcRenderer.send("change_config", { key: "dirBookmarks", val: bookmarks });
  }

  $id("bookmarkName").val("");
}

function delBookmark(el) {
  const $el = $(el);
  const i = $el.data("i");
  const bookmarks = remote.getGlobal("currentConfiguration").dirBookmarks;
  bookmarks.splice(i, 1);
  ipcRenderer.send("change_config", { key: "dirBookmarks", val: bookmarks });
  $el.parent().remove();
}

document.addEventListener("keydown", (e) => {
  if (!id("path")) {
    return;
  }

  console.log(e);
  if (
      e.code == "Backspace" &&
      !$(".form-control").is(":focus") &&
      !$(".find-input").is(":focus") &&
      !$("#bookmarkName").is(":focus")
  ) {
    return upDir();
  }

  if (e.ctrlKey && e.code == "KeyR") {
    return refreshDir();
  }

  if (e.ctrlKey && e.altKey && e.code == "KeyD") {
    return remote.getGlobal("win").webContents.openDevTools();
  }
});

window.addEventListener("resize", resizeLoc);
window.addEventListener("scroll", scrollDir);

function resizeLoc() {
  const dir_path = id("path");
  if (!dir_path) {
    return;
  }

  const width = window.innerWidth / 10 - 60;
  if (dir_path.title.length > width) {
    dir_path.innerText =
        dir_path.title.substr(0, 8) + "..." + dir_path.title.slice(-(width - 10));
  } else {
    dir_path.innerText = dir_path.title;
  }
}
function scrollDir() {
  if (!id("path")) {
    return;
  }

  const scroll = document.documentElement.scrollTop;
  const loc = id("path").title;

  if (!BROWSE_HISTORY[loc]) {
    BROWSE_HISTORY[loc] = {};
  }
  BROWSE_HISTORY[loc].scroll = scroll;
}

function scrollByHistory() {
  const history = BROWSE_HISTORY[id("path").title];
  if (!history || !history.scroll) {
    return;
  }

  document.documentElement.scrollTop = history.scroll;
}

function fixIcons() {
  $(".browse-folder").hover(
      (e) => {
        $(e.target).find("i").removeClass("fa-folder-o");
        $(e.target).find("i").addClass("fa-folder-open-o");
      },
      (e) => {
        $(e.target).find("i").addClass("fa-folder-o");
        $(e.target).find("i").removeClass("fa-folder-open-o");
      },
  );
}

function refreshDir() {
  getDir($id("path").text(), true);
}

// call get_dir when selection is made
function getDir(loc = "", resetCache = false) {
  if (!loc.endsWith(".apk")) {
    $id("processingModal").modal("show");
  }

  if (resetCache) {
    ipcRenderer.send("reset_cache", loc);
  }

  ipcRenderer.send("get_dir", loc);
}

async function readSizeRecursive(item) {
  const stats = await fs.lstat(item);
  if (!stats.isDirectory()) {
    return stats.size;
  }

  let total = 0;
  const list = await fs.readdir(item);
  for (const diritem of list) {
    const size = await readSizeRecursive(path.join(item, diritem));
    total += size;
  }

  return total;
}

async function getDirSize(el, loc) {
  el.onclick = () => false;
  el.innerHTML = `<i class="fa fa-refresh fa-spin"></i> proccess`;
  const size = await readSizeRecursive(loc);
  el.outerText = formatBytes(size);
}

function sqInfo(package) {
  $id("processingModal").modal("show");
  ipcRenderer.send("app_info", { res: "sq", package });
}
function oculusInfo(package) {
  $id("processingModal").modal("show");
  ipcRenderer.send("app_info", { res: "oculus", package });
}
function steamInfo(package) {
  $id("processingModal").modal("show");
  ipcRenderer.send("app_info", { res: "steam", package });
}

function install(loc) {
  $id("processingModal").modal("show");
  ipcRenderer.send("folder_install", { path: loc, update: false });
}

function loadDir(list) {
  let rows = "";
  let cards = "";
  let cards_first = [];
  for (const item of list) {
    // console.log(item);
    if (!item.createdAt) {
      cards_first.unshift(
          `<div class="listitem badge badge-danger"><i class="fa fa-times-circle-o"></i> ${item.name}</div>`,
      );
      continue;
    }

    const modified = item.info.mtime.getTime();
    const fullPath = item.filePath
        .replace("\\", "/")
        .replace("", ":")
        .split("'")
        .join("\\'");
    const symblink = item.isLink
        ? `<small style="font-family: FontAwesome" class="text-secondary fa-link"></small> `
        : "";
    const name = symblink + item.name;

    if (item.isFile) {
      const size = (item.info.size / 1024 / 1024).toFixed(2);
      let rowItem = "";
      if (item.name.endsWith(".apk")) {
        rowItem = `<td class="browse-file" onclick="getDir('${fullPath}')"><b><i class="fa fa-android"></i> &nbsp; ${name}</b></td>`;
        rowItem += `<td>Updated: ${item.info.mtime.toLocaleString()}</td><td>${size} Mb</td>`;
        rowItem = `<tr class="listitem" data-name="${item.name.toUpperCase()}" data-updatedat="${modified}" data-isfile="true">${rowItem}</tr>`;
      } else {
        rowItem = `<td><i class="fa fa-file-o"></i> &nbsp; ${name}</td>`;
        rowItem += `<td>Updated: ${item.info.mtime.toLocaleString()}</td><td>${size} Mb</td>`;
        rowItem = `<tr class="listitem text-secondary" data-name="${item.name.toUpperCase()}" data-updatedat="${modified}" data-isfile="true">${rowItem}</tr>`;
      }

      rows += rowItem;
      continue;
    }

    if (!item.imagePath) {
      let rowItem = `<td class='browse-folder' onclick="getDir('${fullPath}')"><i class="fa fa-folder-o"></i> &nbsp; ${name}</td>`;
      rowItem += `<td>Updated: ${item.info.mtime.toLocaleString()}</td>`;
      rowItem += `<td><a onclick="getDirSize(this, '${fullPath}')"><i class="fa fa-calculator" ></i> get size</a></td>`;

      rows += `<tr class="listitem" data-name="${item.name.toUpperCase()}" data-updatedat="${modified}">${rowItem}</tr>`;
      continue;
    }

    let newribbon = item.newItem
        ? `<div class="ribbon-wrapper"><div class="ribbon ribbon-yellow">NEW!</div></div>`
        : "";
    if (item.mp) {
      let color =
          item.mp.mp == "yes" ? "green" : item.mp.mp == "no" ? "red" : "yellow";
      newribbon = `<div class="ribbon-wrapper"><div class="ribbon ribbon-${color}" title="${item.mp.note}">MP: ${item.mp.mp}</div></div>`;
    }

    let installColor = "primary";
    let installText = "Install";
    if (item.installed) {
      installColor = item.installed > 1 ? "warning" : "success";
      installText = item.installed > 1 ? "Update" : "Reinstall";
    }

    let selectBtn = `<a onclick="getDir('${fullPath}')" class="btn btn-sm btn-primary"><i class="fa fa-folder-open"></i></a> `;
    selectBtn += `<a onclick="install('${fullPath}')" class="btn btn-sm btn-${installColor} col-4">${installText}</a> `;

    if (item.oculusId) {
      selectBtn += `<a onclick="oculusInfo('${item.packageName}')" title="Oculus information" class="btn btn-sm btn-dark">
        <img src="img/oculus.svg" width="14" style="margin-top: -1px;" /></a> `;
    }

    if (item.sqId) {
      selectBtn += `<a onclick="sqInfo('${item.packageName}')" title="SideQuest information" class="btn btn-sm btn-light">
        <img src="img/sq.svg" width="14" style="margin-top: -1px;" /></a> `;
    }

    if (item.steamId) {
      selectBtn += `<a onclick="steamInfo('${item.packageName}');" title="Steam information" class="btn btn-sm btn-info">
        <i class="fa fa fa-steam-square "></i></a> `;
    }

    const youtubeUrl =
        "https://www.youtube.com/results?search_query=oculus+quest+" +
        escape(item.simpleName);
    selectBtn += `<a onclick="shell.openExternal('${youtubeUrl}')" title="Search at Youtube" class="btn btn-sm btn-danger">
      <i class="fa fa-youtube-play"></i></a> `;

    const size = item.size
        ? `${item.size} Mb`
        : `<a onclick="getDirSize(this, '${fullPath}')">
      <i class="fa fa-calculator" title="Calculate folder size"></i> get size
    </a>`;

    const card = `<div class="col mb-3 listitem" style="min-width: 250px;padding-right:5px;max-width: 450px;" data-name="${item.name.toUpperCase()}" data-updatedat="${modified}">
      <div class="card bg-primary text-center bg-dark">

      <div><small><b>${item.simpleName} ${item.note || ""}</b></small></div>
      <div class="ribbon-img-container">
        ${newribbon}
        <img src="${item.imagePath}" class="bg-secondary" style="width: 100%">
      </div>
      <div class="pb-2 pt-2">
          ${selectBtn}
      </div>
      <div style="color:#ccc;" class="card-footer pb-1 pt-1"><small>
        versionCode: ${item.versionCode || "Unknown"} ${
        (item.versionName && `(v.${item.versionName})`) || ""
    }
        <br/>
        ${item.packageName}<br/>
        Updated: ${item.info.mtime.toLocaleString()} &nbsp;
        ${size}
      </small></div>

      </div>
    </div>`;

    if (cards_first.length < 50) {
      cards_first.push(card);
      continue;
    }

    cards += card;
  }

  id("browseCardBody").innerHTML = cards_first.join("\n");
  id("listTable").innerHTML = rows;
  // scrollByHistory();

  if (cards) {
    setTimeout(() => {
      id("browseCardBody").innerHTML += cards;
      scrollByHistory();
    }, 100);
  }
}

function sortFiles(key, asc) {
  const suffix = asc ? "" : "-desc";

  sortElements($id("browseCardBody"), key, asc);
  sortFileElements($id("listTable"), key, asc);
  $id("searchdropdownmenu").hide();

  ipcRenderer.send("change_config", { key: "sortFiles", val: key + suffix });
}

function sortFileElements(el, key, asc) {
  const sortByName = key.startsWith("name");

  el.html(
      el
          .find(".listitem")
          .sort((a, b) => {
            const valA = sortByName
                ? a.dataset.name.toLowerCase()
                : a.dataset.updatedat;
            const valB = sortByName
                ? b.dataset.name.toLowerCase()
                : b.dataset.updatedat;
            if (valA < valB) {
              return asc ? -1 : 1;
            }
            if (valA > valB) {
              return asc ? 1 : -1;
            }
            return 0;
          })
          .sort((a, b) => {
            if (a.dataset.isfile === "true" && b.dataset.isfile !== "true") {
              return 1;
            }
            if (a.dataset.isfile !== "true" && b.dataset.isfile === "true") {
              return -1;
            }
            return 0;
          }),
  );
}