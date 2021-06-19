/*----------------------------------------------------------------------------\
|                             Filterable Table 0.03                           |
|-----------------------------------------------------------------------------|
| original code : http://www.codeproject.com/jscript/filter.asp (by WoutL)    |
|-----------------------------------------------------------------------------|
| 2005-10-15 | multiple tHead (and related tBody) rows support panda@arino.jp |
| 2006-09-05 | cleanup / bugfix / textbox / safari support     panda@arino.jp |
|-----------------------------------------------------------------------------|
| Created 2005-07-27 | All changes are in the log above. | Updated 2006-09-05 |
\----------------------------------------------------------------------------*/
function FilterableTable(oTable, oSortTypes, bMultipleTHead)
{
	while (oTable.tagName.toUpperCase() != 'TABLE') {
		oTable = oTable.parentNode;
	}
	this.sortTypes = oSortTypes || [];
	this.table = oTable;
	this.tHead = oTable.tHead;
	this.tBody = oTable.tBodies[0];
	this.single = !(bMultipleTHead || false);
	this.document = oTable.ownerDocument || oTable.document;
	var oThis = this;
	this._optChange = function (e) {
		oThis.filter(e);
	}
	this._toggle = function (e) {
		oThis.toggleFilter(e);
	}
	this.filterEnabled = false;

	// enabler
	var form = document.createElement('FORM');
	form.action = '#';
	var input = document.createElement('INPUT');
	input.type = 'checkbox';
	if (typeof input.addEventListener != 'undefined') {
		input.addEventListener('click', this._toggle, false);
	} else if (typeof input.attachEvent != 'undefined') {
		input.attachEvent('onclick', this._toggle);
	} else {
		input.onclick = this._toggle;
	}
	var text = document.createElement('LABEL');
	text.appendChild(input);
	text.appendChild(document.createTextNode('Enable Filter'));
	form.appendChild(text);
	oTable.parentNode.insertBefore(form, oTable);
}
FilterableTable.gecko = navigator.product == "Gecko";
FilterableTable.safari = (navigator.userAgent.indexOf("Safari") != -1);
FilterableTable.msie = /msie/i.test(navigator.userAgent);
FilterableTable.prototype.toggleFilter = function (e)
{
	var sel = e.target || e.srcElement;
	sel.checked
		? this.attachFilter()
		: this.detachFilter();
}
FilterableTable.prototype.detachFilter = function ()
{
	if (! this.filterEnabled) { return; }

	// Remove the filter
	this.showAll();
	for (var row = 0; row < this.filterRows.length; row++) {
		this.tHead.removeChild(this.filterRows[row]);
	}
	this.filterEnabled = false;
}
FilterableTable.prototype.attachFilter = function ()
{
	if (this.filterEnabled) { return; }

	// Check if the table has any rows. If not, do nothing
	if (this.tBody.children.length == 0) { return; }
	if (this.table.style.display == 'none') { return; }

	// Insert the filterrow and add cells whith drowdowns.
	this.filterRows = new Array();
	this.hrowCount = this.tHead.rows.length;
	this.step = this.single ? 1 : this.hrowCount;
	for (var i = 0; i < this.hrowCount; i++) {
		this.filterRows[i] = this.tHead.insertRow(this.tHead.rows.length);
	}
	this.filterObjects = new Array();
	var index = 0;
	var fullColumnCount = Array.prototype.slice.call(this.tHead.rows[0].cells).map(x => x.colSpan).reduce((a, c) => a + c);
	const spanFlag = new Array(this.hrowCount);
	for (var i = 0; i < this.hrowCount; i++) {
		spanFlag[i] = new Array(fullColumnCount);
		spanFlag[i].fill(0);
	}

	for (var j = 0; j < this.hrowCount; j++) {
		var row = new Array();
		for (var i = 0, fi = 0; i < this.tHead.rows[j].cells.length; i++) {
			for (; fi < fullColumnCount && spanFlag[j][fi] !== 0; fi++) ;
			var sortType = this.sortTypes[index++] || 'None';
			var cell = this.tHead.rows[j].cells[i];
			var c = document.createElement('TH');
			
			for (var n = 0, len = cell.classList.length; n < len; n++) {
				if (cell.classList[n].indexOf('table_filter_') !== -1) {
					c.className = cell.classList[n];
					break;
				}
			}
			if (cell.style.display) {
				c.style.display = cell.style.display;
			}


			c.rowSpan = cell.rowSpan;
			c.colSpan = cell.colSpan;
			this.filterRows[j].appendChild(c);

			for (var y = 0; y < c.rowSpan; y++) {
				for (var x = 0; x < c.colSpan; x++) {
					spanFlag[j + y][fi + x] |= 1;
				}
			}

			if (sortType === 'None') {
				fi += c.colSpan;
				continue;
			}

			var text = document.createElement('INPUT');
			text.className = 'filter-box';
			text.type = 'text';

			if (typeof text.addEventListener != 'undefined') {
				text.addEventListener('change', this._optChange, false);
				text.addEventListener('keyup', this._optChange, false);
			} else if (typeof text.attachEvent != 'undefined') {
				text.attachEvent('onchange', this._optChange);
				text.attachEvent('onkeyup', this._optChange);
			} else {
				text.onchange = this._optChange;
				text.onkeyup = this._optChange;
			}

			c.appendChild(text);
			c.appendChild(document.createElement('BR'));

			var opt = document.createElement('SELECT');
			opt.size = 5;
			opt.multiple = true;

			if (typeof opt.addEventListener != 'undefined') {
				opt.addEventListener('change', this._optChange, false);
			} else if (typeof opt.attachEvent != 'undefined') {
				opt.attachEvent('onchange', this._optChange);
			} else {
				opt.onchange = this._optChange;
			}

			c.appendChild(opt);
			row[i] = {columnIndex: i, rowIndex: j, opt: opt, text: text, filter: {}, regexp: false, enable: false, fullColumnIndex: fi, "sortType": sortType };
			fi += c.colSpan;
		}
		this.filterObjects[j] = row;
	}
	// Fill the filters
	this.fillFilters();
	this.filterEnabled = true;
}
// Checks if a column is filtered
FilterableTable.prototype.inFilter = function (row, column)
{
	return this.filterObjects[row][column].enable;
}
FilterableTable.prototype.hasFilter = function(row, column)
{
  return typeof this.filterObjects[row][column] !== 'undefined';
}

// Fills the filters for columns which are not fiiltered
FilterableTable.prototype.fillFilters = function ()
{
	for (var row = 0; row < this.filterRows.length; row++) {
		for (var column = 0; column < this.filterRows[row].cells.length; column++) {
			if (this.hasFilter(row, column) && !this.inFilter(row, column)) {
				this.buildFilter(row, column, {'(all)':true});
			}
		}
	}
}

// Fills the columns dropdown box.
// setValue is the value which the dropdownbox should have one filled.
// If the value is not suplied, the first item is selected
FilterableTable.prototype.buildFilter = function (rowIndex, columnIndex, setValue)
{
	// Get a reference to the selectbox.
	var filterObject = this.filterObjects[rowIndex][columnIndex];
	var opt = filterObject.opt;

	// remove all existing items
	while (opt.length > 0) {
		opt.remove(0);
	}
	opt.options[0] = new Option('(all)', '(all)');
//	opt.options.add(new Option('(all)', '(all)'), 0);
	if (setValue['(all)']) { opt.options[0].selected = true; }

	var values = new Array();

	// put all relevant strings in the values array.
	for (var i = 0; i < this.tBody.children.length; i += this.step) {
		var r = this.tBody.children[(this.single ? i : i + rowIndex)];
		if (r.style.display != 'none' && r.className != 'noFilter') {
			values.push(this.getInnerText(r.children[this.single ? filterObject.fullColumnIndex : columnIndex]));
		}
	}
	values.sort();

	//add each unique string to the selectbox
	var value = '';
	for (var i = 0; i < values.length; i++) {
		if (values[i].toLowerCase() != value) {
			value = values[i].toLowerCase();
			var option = new Option(values[i], value);
			if (setValue[value]) { option.selected = true; }
			opt.options[opt.options.length] = option;
//			opt.options.add(option);
		}
	}
}
FilterableTable.prototype.getInnerText = function (oNode)
{
	var s = '';
	var cs = oNode.childNodes;
	var l = cs.length;
	for (var i = 0; i < l; i++) {
		if (cs[i].style && cs[i].style.display == 'none') { continue; }
		switch (cs[i].nodeType) {
			case 1: //ELEMENT_NODE
				s += this.getInnerText(cs[i]);
				break;
			case 3:	//TEXT_NODE
				s += cs[i].nodeValue.trim('\n');
				break;
		}
	}
	return s;
}
FilterableTable.getCellIndex = function (cell) {
	var cells = cell.parentNode.childNodes;
	for (var column = 0; cells[column] != cell && column < cells.length; column++)
		;
	return column;
}
// This function is called when a dropdown box changes
FilterableTable.prototype.filter = function (e) {
	var sel = e.target || e.srcElement;
	// The column number of the column which should be filtered
	var columnIndex = FilterableTable.safari
		? FilterableTable.getCellIndex(sel.parentNode)
		: sel.parentNode.cellIndex;
	var rowIndex = sel.parentNode.parentNode.rowIndex - (this.single ? this.hrowCount : this.step);
	var filterObject = this.filterObjects[rowIndex][columnIndex];

	var filterText  = {};
	var regexp = false;
	var compare = false;
	var compare_value;
	if (sel.options) {
		for (var i = 0; i < sel.options.length; i++) {
			filterText[sel.options[i].value] = sel.options[i].selected;
			if (i > 0 && sel.options[i].selected) {
				filterText['(all)'] = false;
			}
		}
		filterObject.text.value = '';
	} else {
		if (sel.value == '') {
			filterText['(all)'] = true;
		} else {
			try {
				if (filterObject.sortType.indexOf('Number') !== -1) {
					const opm = /([<>=!]+)/.exec(sel.value);
					if (opm) {
						if (opm.index == 0 && (opm[0]+'x' in FilterableTable.compare_op)) {
							compare_value = parseFloat(sel.value.substring(opm[0].length));
							compare = FilterableTable.compare_op[opm[0]+'x'];
						}
						else if (0 < opm.index && ('x'+opm[0] in FilterableTable.compare_op)) {
							compare_value = parseFloat(sel.value.substring(0, opm.index));
							compare = FilterableTable.compare_op['x'+opm[0]];
						}
					}
				}
				if (typeof compare_value === 'undefined') {
					regexp = new RegExp(sel.value, 'i');
				}
			} catch (e) {
				return;
			}
			filterText[sel.value] = true;
		}
	}

	filterObject.enable = (! filterText['(all)']);
	filterObject.filter = filterText;
	filterObject.regexp = regexp;
	filterObject.compare = compare;
	filterObject.value = compare_value;

	// first set all rows to be displayed
	this.showAll();

	// the filter ou the right rows.
	var hideRows = {};
	for (var rowIndex in this.filterObjects) {
		var r = parseInt(rowIndex);
		for (var columnIndex in this.filterObjects[rowIndex]) {
			var n = parseInt(columnIndex);
			var obj = this.filterObjects[rowIndex][columnIndex];
			if (! obj.enable) { continue; }
			// First fill the select box for this column
			this.buildFilter(obj.rowIndex, obj.columnIndex, obj.filter);
			// Apply the filter
			for (var i = 0; i < this.tBody.children.length; i += this.step) {
				if (hideRows[i]) { continue; }
				var row = this.tBody.children[(this.single ? i : i + r)];
				var cell = row.children[(this.single ? obj.fullColumnIndex : n)];
				var text = this.getInnerText(cell).toLowerCase();
				if (row.className != 'noFilter') {
					if (obj.regexp) {
						if (! text.match(obj.regexp)) {
							hideRows[i] = true;
						}
					}
					else if (obj.value) {
						if (!obj.compare(obj.value, parseFloat(text))) {
							hideRows[i] = true;
						}
					}
					else {
						if (! obj.filter[text]) {
							hideRows[i] = true;
						}
					}
				}
			}
		}
	}

	for (var i in hideRows) {
		var r = parseInt(i);
		for (var j = 0; j < this.step; j++) {
			this.tBody.children[r + j].style.display = 'none';
		}
	}

	// Fill the dropdownboxes for the remaining columns.
	this.fillFilters();
}

FilterableTable.prototype.showAll = function () {
	for (var i = 0; i < this.tBody.children.length; i++) {
		this.tBody.rows[i].style.display = '';
	}
}

FilterableTable.compare_op = {
	'<=x' : function(a, b) { return a <= b; },
	'<x'  : function(a, b) { return a < b; },
	'>=x' : function(a, b) { return a >= b; },
	'>x'  : function(a, b) { return a > b; },
	'x<=' : function(a, b) { return b <= a},
	'x<'  : function(a, b) { return b < a},
	'x>=' : function(a, b) { return b >= a},
	'x>'  : function(a, b) { return b > a},
	'x='  : function(a, b) { return a == b; },
	'=x'  : function(a, b) { return a == b; },
	'x!'  : function(a, b) { return a != b; },
	'!x'  : function(a, b) { return a != b; }
};
