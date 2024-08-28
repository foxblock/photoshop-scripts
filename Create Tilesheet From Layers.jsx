// This script will copy each layer of an open file to a newly created document
// and adjust position, so each layer forms one frame in a tilesheet

// Docs: https://theiviaxx.github.io/photoshop-docs/index.html

/*
@@@BUILDINFO@@@ Create Tilesheet From Layers.jsx 1.1
*/

/*

// BEGIN__HARVEST_EXCEPTION_ZSTRING

<javascriptresource>
<name>$$$/JavaScripts/CombineLayersToTileImage/Menu=Create Tilesheet From Layers...</name>
<category>layers</category>
<enableinfo>true</enableinfo>
</javascriptresource>

// END__HARVEST_EXCEPTION_ZSTRING

*/

// ok and cancel button constants
var runButtonID = 1;
var cancelButtonID = 2;

var numberOfFrames = 0;
var numberOfVisibleFrames = 0;
var dlgMain = null;
var currentDocRef = null;
var newDocRef = null;
var docWidth = 1;
var docHeight = 1;
var exportInfo = {};

main();

function updateDataFromDialog(dialog, data) {
    if (dialog.pnlOptions.grpRadios.rbRows.value)
    {
        data.useRows = true;
        data.fixedAmount = parseInt(dialog.pnlOptions.grpEdits.etRows.text, 10);
    }
    else
    {
        data.useRows = false;
        data.fixedAmount = parseInt(dialog.pnlOptions.grpEdits.etColumns.text, 10);
    }
    if (data.fixedAmount <= 1 || isNaN(data.fixedAmount))
        data.fixedAmount = 1;
    data.copyVisible = dialog.pnlOptions.grpLayers.cbLayers.value;
    data.topToBottom = dialog.pnlOptions.ddDir.selection == 0;

    data.numberOfFrames = data.copyVisible ? numberOfVisibleFrames : numberOfFrames;
    
    data.cellsX = data.useRows ? Math.ceil(data.numberOfFrames / data.fixedAmount) : data.fixedAmount;
    data.cellsY = data.useRows ? data.fixedAmount : Math.ceil(data.numberOfFrames / data.fixedAmount);
}

function setInfoText() {
    updateDataFromDialog(dlgMain, exportInfo);

    var emptyCells = exportInfo.cellsX * exportInfo.cellsY - exportInfo.numberOfFrames;
    dlgMain.stInfo.text = "Number of frames: " + exportInfo.numberOfFrames
        + "\nResult: " + exportInfo.cellsX + " x " + exportInfo.cellsY + " tiles (" + emptyCells + " empty)"
        + "\nResult size: " + (exportInfo.cellsX * docWidth) + " x " + (exportInfo.cellsY * docHeight) + " px"
        ;
}

// Going through all layers takes a while on large sets (for some reason)
function countLayers(parent) {
    for (var i = 0; i < parent.layers.length; ++i) {
        if (parent.layers[i].typename == "LayerSet") {
            countLayers(parent.layers[i]);
            continue;
        }
        if (parent.layers[i].kind != LayerKind.NORMAL)
            continue;
        if (parent.layers[i].visible)
            ++numberOfVisibleFrames;
        ++numberOfFrames;
    }
}

function copyLayers(parent, state) {
    var start = exportInfo.topToBottom ? 0 : parent.layers.length-1;
    var end = exportInfo.topToBottom ? parent.layers.length : -1;
    var inc = exportInfo.topToBottom ? 1 : -1;
    for (var i = start; i != end; i += inc) {
        app.activeDocument = currentDocRef;

        if (exportInfo.copyVisible && !parent.layers[i].visible)
            continue;

        if (parent.layers[i].typename == "LayerSet") {
            copyLayers(parent.layers[i], state);
            continue;
        }

        if (parent.layers[i].kind != LayerKind.NORMAL) {
            continue;
        }

        try {
            // have to manually set visible to true, else the top layer
            // is not copied when invisible and selected at start of operation
            var vis = parent.layers[i].visible;
            if (!vis)
                parent.layers[i].visible = true;
            parent.layers[i].copy();
            app.activeDocument = newDocRef;
            var selRegion = Array(Array(state.posX,state.posY),
                Array(state.posX + docWidth, state.posY),
                Array(state.posX + docWidth, state.posY + docHeight),
                Array(state.posX, state.posY + docHeight),
                Array(state.posX, state.posY));
            newDocRef.selection.select(selRegion);
            newDocRef.paste();
            app.activeDocument = currentDocRef;
            if (!vis)
                parent.layers[i].visible = false;
            state.index++;
            if (state.index == exportInfo.cellsX)
            {
                state.index = 0;
                state.posX = 0;
                state.posY += docHeight;
            }
            else
            {
                state.posX += docWidth;
            }
        } 
        catch (err)
        {
            alert(err);
        }
    }
}

function main() {
    currentDocRef = app.activeDocument;
    docHeight = currentDocRef.height.as('px');
    docWidth = currentDocRef.width.as('px');

    countLayers(currentDocRef);

    /// --- DIALOG ---
    dlgMain = new Window("dialog", "Copy Layers to Tiled Image");
    
    // match our dialog background color to the host application
    var brush = dlgMain.graphics.newBrush(dlgMain.graphics.BrushType.THEME_COLOR, "appDialogBackground");
    dlgMain.graphics.backgroundColor = brush;
    dlgMain.graphics.disabledBackgroundColor = dlgMain.graphics.backgroundColor;

    dlgMain.orientation = 'column';
    dlgMain.alignChildren = 'left';

    // -- two groups, one for left and one for right ok, cancel
    dlgMain.grpTop = dlgMain.add("group");
    dlgMain.grpTop.orientation = 'row';
    dlgMain.grpTop.alignChildren = 'top';
    dlgMain.grpTop.alignment = 'fill';

    dlgMain.grpTopLeft = dlgMain.grpTop.add("group");
    dlgMain.grpTopLeft.orientation = 'column';
    dlgMain.grpTopLeft.alignChildren = 'left';
    dlgMain.grpTopLeft.alignment = 'fill';
    
    dlgMain.pnlOptions = dlgMain.grpTopLeft.add("panel", undefined, "Options");
    dlgMain.pnlOptions.orientation = 'column';
    dlgMain.pnlOptions.alignChildren = 'left';
    dlgMain.pnlOptions.alignment = 'fill';
    
    dlgMain.pnlOptions.grpRowCol = dlgMain.pnlOptions.add("group");
    dlgMain.pnlOptions.grpRowCol.orientation = 'row';

    dlgMain.pnlOptions.grpRadios = dlgMain.pnlOptions.grpRowCol.add("group");
    dlgMain.pnlOptions.grpRadios.orientation = 'column';
    dlgMain.pnlOptions.grpRadios.alignChildren = 'left';
    dlgMain.pnlOptions.grpRadios.rbColumns = dlgMain.pnlOptions.grpRadios.add( "radiobutton", undefined, "Columns:");
    dlgMain.pnlOptions.grpRadios.rbColumns.value = true;
    dlgMain.pnlOptions.grpRadios.rbColumns.onClick = setInfoText;
    dlgMain.pnlOptions.grpRadios.rbRows = dlgMain.pnlOptions.grpRadios.add( "radiobutton", undefined, "Rows:");
    dlgMain.pnlOptions.grpRadios.rbRows.value = false;
    dlgMain.pnlOptions.grpRadios.rbRows.onClick = setInfoText;

    dlgMain.pnlOptions.grpEdits = dlgMain.pnlOptions.grpRowCol.add("group");
    dlgMain.pnlOptions.grpEdits.orientation = 'column';
    dlgMain.pnlOptions.grpEdits.alignChildren = 'left';
    dlgMain.pnlOptions.grpEdits.alignment = 'fill';
    dlgMain.pnlOptions.grpEdits.etColumns = dlgMain.pnlOptions.grpEdits.add("edittext", undefined, "1");
    dlgMain.pnlOptions.grpEdits.etColumns.alignment = 'fill';
    dlgMain.pnlOptions.grpEdits.etColumns.preferredSize.width = 40;
    dlgMain.pnlOptions.grpEdits.etColumns.onChange = setInfoText;
    dlgMain.pnlOptions.grpEdits.etRows = dlgMain.pnlOptions.grpEdits.add("edittext", undefined, "1");
    dlgMain.pnlOptions.grpEdits.etRows.alignment = 'fill';
    dlgMain.pnlOptions.grpEdits.etRows.preferredSize.width = 40;
    dlgMain.pnlOptions.grpEdits.etRows.onChange = setInfoText;

    dlgMain.pnlOptions.ddDir = dlgMain.pnlOptions.add('dropdownlist', undefined, undefined, {'items': ['Top to button', 'Bottom to top']});
    dlgMain.pnlOptions.ddDir.orientation = 'row';
    dlgMain.pnlOptions.ddDir.selection = 0;
    
    dlgMain.pnlOptions.grpLayers = dlgMain.pnlOptions.add("group");
    dlgMain.pnlOptions.grpLayers.cbLayers = dlgMain.pnlOptions.grpLayers.add("checkbox", undefined, "Copy visible layers only");
    dlgMain.pnlOptions.grpLayers.cbLayers.value = true;
    dlgMain.pnlOptions.grpLayers.cbLayers.onClick = setInfoText;
    
    // the right side of the dialog, the ok and cancel buttons
    dlgMain.grpTopRight = dlgMain.grpTop.add("group");
    dlgMain.grpTopRight.orientation = 'column';
    dlgMain.grpTopRight.alignChildren = 'fill';
    
    dlgMain.btnRun = dlgMain.grpTopRight.add("button", undefined, "Run");
    dlgMain.btnRun.onClick = function() {
        dlgMain.close(runButtonID);
    }

    dlgMain.btnCancel = dlgMain.grpTopRight.add("button", undefined, "Cancel");
    dlgMain.btnCancel.onClick = function() { 
        dlgMain.close(cancelButtonID); 
    }

    dlgMain.btnAuto = dlgMain.grpTopRight.add("button", undefined, "Auto");
    dlgMain.btnAuto.helpTip = "Calculates colums and rows, so the resulting texture is the most square it can be without empty cells.";
    dlgMain.btnAuto.onClick = function() {
        if (exportInfo.numberOfFrames <= 1) {
            dlgMain.pnlOptions.grpEdits.etColumns.text = "1";
            dlgMain.pnlOptions.grpEdits.etRows.text = "1";
            setInfoText();
            return;
        }

        var widthGreaterHeight = docWidth > docHeight;

        var lastFactor = Infinity;
        var lastDiv = 0;
        // find exact divider which generate the "squarest" texture -> W/H ~= 1
        for (var i = 1; i <= exportInfo.numberOfFrames / 2; ++i) {
            if (exportInfo.numberOfFrames % i != 0)
                continue;

            var factor = 0;
            // test longer side -> faster results (smaller divider)
            if (widthGreaterHeight)
                factor = (docWidth * i) / (docHeight * exportInfo.numberOfFrames / i);
            else
                factor = (docHeight * i) / (docWidth * exportInfo.numberOfFrames / i);
            if (factor < 1)
                factor = 1 / factor;

            // result will be a local and global minimum, so we can break here
            if (lastFactor < factor)
                break;

            lastFactor = factor;
            lastDiv = i;
        }
        dlgMain.pnlOptions.grpEdits.etColumns.text = widthGreaterHeight ? lastDiv.toString() : (exportInfo.numberOfFrames / lastDiv).toString();
        dlgMain.pnlOptions.grpEdits.etRows.text = widthGreaterHeight ? (exportInfo.numberOfFrames / lastDiv).toString() : lastDiv.toString();
        setInfoText();
    }

    dlgMain.defaultElement = dlgMain.btnRun;
    dlgMain.cancelElement = dlgMain.btnCancel;

    // the bottom of the dialog
    dlgMain.grpBottom = dlgMain.add("group");
    dlgMain.grpBottom.orientation = 'column';
    dlgMain.grpBottom.alignChildren = 'left';
    dlgMain.grpBottom.alignment = 'fill';
    
    dlgMain.pnlHelp = dlgMain.grpBottom.add("panel");
    dlgMain.pnlHelp.alignment = 'fill';
    dlgMain.pnlHelp.alignChildren = 'left';

    dlgMain.stHelp = dlgMain.pnlHelp.add("statictext", undefined, "You can either set a fixed amount of rows or columns, the other value will be calculated by the number of layers.\nAll normal layers will be considered.\nThe background colour of the tilesheet will be your current background colour.", {multiline:true});
    dlgMain.stHelp.alignment = 'fill';

    dlgMain.stInfo = dlgMain.pnlHelp.add("statictext", undefined, "1\n2\n3", {multiline:true});
    dlgMain.stInfo.alignment = 'fill';

    setInfoText();
    
    // give the hosting app the focus before showing the dialog
    app.bringToFront();

    dlgMain.center();
    var dialogResult = dlgMain.show();
    
    if (cancelButtonID == dialogResult) {
        return 1;
    }

    /// --- WORK ---
    updateDataFromDialog(dlgMain, exportInfo);

    if (exportInfo.numberOfFrames == 0) {
        alert("Error: No compatible layers found! Only normal layers will be copied.");
        return 1;
    }

    // save current unit settings and set everything to pixels
    var startRulerUnits = app.preferences.rulerUnits;
    var startTypeUnits = app.preferences.typeUnits;
    var startDisplayDialogs = app.displayDialogs;
    app.preferences.rulerUnits = Units.PIXELS;
    app.preferences.typeUnits = TypeUnits.PIXELS;
    app.displayDialogs = DialogModes.NO;

    newDocRef = app.documents.add(exportInfo.cellsX * docWidth, exportInfo.cellsY * docHeight, 
        currentDocRef.resolution, "Tilesheet", NewDocumentMode.RGB, DocumentFill.BACKGROUNDCOLOR);

    var copyState = {posX:0, posY:0, index:0};
    copyLayers(currentDocRef, copyState);

    app.activeDocument = newDocRef;
    newDocRef.flatten();
    
    app.preferences.rulerUnits = startRulerUnits;
    app.preferences.typeUnits = startTypeUnits;
    app.displayDialogs = startDisplayDialogs;
    
    return 0;
}