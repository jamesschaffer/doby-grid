// (c) 2014 Evgueni Naverniouk, Globex Designs, Inc.
// Doby may be freely distributed under the MIT license.
// For all details and documentation:
// https://github.com/globexdesigns/doby-grid

/*global _, $, DobyGrid */

describe("Column Options", function () {
	"use strict";


	// ==========================================================================================


	// Utilities for resetting the grid
	var defaultData = function () {
		return JSON.parse(JSON.stringify({
			columns: [
				{id: 'id', field: 'id', name: 'id'},
				{id: 'name', field: 'name', name: 'name'}
			],
			data: [
				{data: {id: 189, name: 'test'}, id: 189},
				{data: {id: 289, name: 'test2'}, id: 289}
			]
		}));
	};

	var resetGrid = function (options) {
		options = options || {};
		var grid = new DobyGrid(options),
			fixture = setFixtures();

		// This is needed for grunt-jasmine tests which doesn't read the CSS
		// from the HTML version of jasmine.
		fixture.attr('style', 'position:absolute;top:0;left:0;opacity:0;width:500px');

		grid.appendTo(fixture);
		return grid;
	};


	// ==========================================================================================


	describe("options.aggregators", function () {
		it("should be null by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.aggregators).toEqual(null);
			});
		});


		// ==========================================================================================


		it("should throw an exception is given something other than an array", function () {
			_.each([1, 'test', function () {}, {}], function (test, i) {
				expect(function () {
					resetGrid($.extend(defaultData(), {
						columns: [{
							id: i,
							aggregators: test
						}]
					}));
				}).toThrow('A column\'s "aggregators" value must be array. Invalid value given for column "' + i + '"');
			});
		});


		// ==========================================================================================


		it("should render an Aggregate row at the bottom of the grid", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					field: 'id',
					name: 'id',
					aggregators: [{
						name: "Test",
						fn: function (column) {
							this.formatter = function () {
								return "Test " + column.name;
							};
							this.process = function () {};
							return this;
						}
					}]
				}, {
					id: 'name',
					field: 'name',
					name: 'name',
					aggregators: [{
						name: "Another Test",
						fn: function (column) {
							this.formatter = function () {
								return "Test " + column.name;
							};
							this.process = function () {};
							return this;
						}
					}]
				}]
			}));

			// Check for a rendered aggregate row at the bottom
			var lastRow = grid.$el.find('.doby-grid-row').last();
			expect(lastRow.hasClass('doby-grid-row-total')).toEqual(true);

			lastRow.children('.doby-grid-cell').each(function (i) {
				expect($(this).text()).toEqual('Test ' + grid.options.columns[i].name);
			});
		});


		// ==========================================================================================


		it("should gracefully handle missing formatter functions in the aggregator", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					field: 'id',
					name: 'id',
					aggregators: [{
						fn: function () {
							this.process = function () {};
							return this;
						}
					}]
				}, {
					id: 'name',
					field: 'name',
					name: 'name',
					aggregators: [{
						name: null,
						fn: function () {
							this.process = function () {};
							return this;
						}
					}]
				}]
			}));

			// Check for a rendered aggregate row at the bottom
			var lastRow = grid.$el.find('.doby-grid-row').last();
			expect(lastRow.hasClass('doby-grid-row-total')).toEqual(true);

			lastRow.children('.doby-grid-cell').each(function () {
				expect($(this).text()).toEqual('');
			});
		});


		// ==========================================================================================


		it("should gracefully handle missing processor functions in the aggregator", function () {
			expect(function () {
				resetGrid($.extend(defaultData(), {
					columns: [{
						id: 'id',
						field: 'id',
						name: 'id',
						aggregators: [{
							fn: function () {
								return this;
							}
						}]
					}, {
						id: 'name',
						field: 'name',
						name: 'name',
						aggregators: [{
							name: null,
							fn: function () {
								return this;
							}
						}]
					}]
				}));
			}).toThrow("The column aggregator for \"id\" is missing a valid 'process' function.");
		});
	});


	// ==========================================================================================


	describe("options.cache", function () {
		it("should be false by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.cache).toEqual(false);
			});
		});


		// ==========================================================================================


		it("should cache the HTML value of cells when enabled and postprocessing is on", function () {
			var poem = "I'm a little teapot",
				verse1 = "S & S",
				verse2 = "Something Something",
				callbackcount = 0,
				grid = resetGrid($.extend(defaultData(), {
					columns: [{
						cache: false,
						id: 'id',
						name: 'id',
						postprocess: function (data) {
							data.$cell.html(poem);
						}
					}, {
						cache: true,
						id: 'verse1',
						name: 'verse1',
						postprocess: function (data, callback) {
							setTimeout(function () {
								data.$cell.html(verse1);
								callbackcount++;
								callback();
							}, 10);
						}
					}, {
						cache: true,
						id: 'verse2',
						name: 'verse2',
						postprocess: function (data, callback) {
							setTimeout(function () {
								data.$cell.html(verse2);
								callbackcount++;
								callback();
							}, 10);
						}
					}]
				}));

			// Check to see if all cells are loaded
			grid.$el.find('.doby-grid-cell').each(function () {
				// Expect everything to be empty
				expect($(this).text()).toEqual('');
			});

			// Wait until postprocessing has rendered and cached everything
			waitsFor(function () {
				return grid.$el.find('.doby-grid-cell:empty').length === 0 && callbackcount === 4;
			});

			runs(function () {
				// Expect cells to have new data
				grid.$el.find('.doby-grid-row').each(function () {
					$(this).children('.doby-grid-cell').each(function (i) {
						if (i === 0) {
							expect($(this).text()).toEqual(poem);
						} else if (i == 1) {
							expect($(this).text()).toEqual(verse1);
						} else if (i == 2) {
							expect($(this).text()).toEqual(verse2);
						}
					});
				});

				// Force the grid to be re-rendered via resize(). This is a big of a hack.
				grid.resize();

				// First column should be empty, but the others should be cached
				grid.$el.find('.doby-grid-row').each(function () {
					$(this).children('.doby-grid-cell').each(function (i) {
						if (i === 0) {
							expect($(this).text()).toEqual('');
						} else if (i == 1) {
							expect($(this).text()).toEqual(verse1);
						} else if (i == 2) {
							expect($(this).text()).toEqual(verse2);
						}
					});
				});
			});
		});


		// ==========================================================================================


		it("should recache when the grid is re-ordered", function () {
			var grid = resetGrid({
				columns: [{
					cache: true,
					id: 'id',
					name: 'id',
					field: 'id',
					postprocess: function (data, callback) {
						data.$cell.html('post-' + data.data.id);
						callback();
					}
				}],
				data: _.map(_.range(0, 100), function (i) {
					return {
						id: i,
						data: {
							id: i
						}
					};
				})
			});

			// Wait until postprocessing has rendered at least the first row
			waitsFor(function () {
				return grid.$el.find('.doby-grid-cell').eq(0).text() == 'post-0' && grid.$el.find('.doby-grid-cell').eq(1).text() == 'post-1';
			});

			runs(function () {
				// Expect cells to have data in the right order
				grid.$el.find('.doby-grid-cell').each(function (i) {
					if ($(this).text().indexOf('post-') >= 0) {
						expect($(this).text()).toEqual('post-' + i);
					}
				});

				// Reverse grid sort
				grid.sortBy('id', false);
			});

			// Wait until postprocessing has rendered at least the first row
			// in the right order!
			waitsFor(function () {
				return grid.$el.find('.doby-grid-cell:first').text() === '99';
			}, "the grid to update the cache after sorting");
		});


		// ==========================================================================================


		it("should recache when a grid's item is updated", function () {
			var grid = resetGrid({
				columns: [{
					cache: true,
					id: 'count',
					name: 'count',
					field: 'count',
					postprocess: function (data, callback) {
						data.$cell.html('post-' + data.data.data.count);
						callback();
					}
				}],
				data: [{
					id: 1,
					data: {
						id: 1,
						count: 1
					}
				}]
			});

			// Wait until postprocessing has rendered the row
			waitsFor(function () {
				return grid.$el.find('.doby-grid-cell').eq(0).text() == 'post-1';
			});

			runs(function () {
				// Update the value of the row
				grid.setItem(1, {data: {count: 2}});
			});

			// Wait until postprocessing has re-rendered the row with the updated value
			waitsFor(function () {
				return grid.$el.find('.doby-grid-cell').eq(0).text() == 'post-2';
			}, 500);
		});


		// ==========================================================================================


		it("should recache when a grid's nested rows are updated", function () {
			var grid = resetGrid({
				columns: [{
					cache: true,
					id: 'count',
					name: 'count',
					field: 'count',
					postprocess: function (data, callback) {
						data.$cell.html('post-' + data.data.data.count);
						callback();
					}
				}],
				data: [{
					id: 1,
					data: {
						id: 1,
						count: 1
					},
					rows: {
						0: {
							id: 2,
							data: {
								id: 2,
								count: 1
							}
						}
					}
				}]
			});

			// Wait until postprocessing has rendered the row
			waitsFor(function () {
				var $cells = grid.$el.find('.doby-grid-cell'),
					$firstcell = $cells.eq(0),
					$secondcell = $cells.eq(1);
				return $firstcell.text() == 'post-1' && $secondcell.text() == 'post-1';
			});

			runs(function () {
				// Update the value of the nested row
				grid.setItem(1, {
					id: 1,
					data: {
						id: 1,
						count: 1
					},
					rows: {
						0: {
							id: 2,
							data: {
								id: 2,
								count: 2
							}
						}
					}
				});
			});

			// Wait until postprocessing has re-rendered the row with the updated value
			waitsFor(function () {
				var $cells = grid.$el.find('.doby-grid-cell'),
					$firstcell = $cells.eq(0),
					$secondcell = $cells.eq(1);
				return $firstcell.text() == 'post-1' && $secondcell.text() == 'post-2';
			}, 500);
		});


		// ==========================================================================================


		it("should recache nested rows when the parent row is updated", function () {
			var grid = resetGrid({
				columns: [{
					cache: true,
					id: 'count',
					name: 'count',
					field: 'count',
					postprocess: function (data, callback) {
						data.$cell.html('post-' + data.data.data.count);
						callback();
					}
				}],
				data: [{
					id: 1,
					data: {
						id: 1,
						count: 1
					},
					rows: {
						0: {
							id: 2,
							data: {
								id: 2,
								count: 1
							}
						}
					}
				}]
			});

			// Wait until postprocessing has rendered the row
			waitsFor(function () {
				var $cells = grid.$el.find('.doby-grid-cell'),
					$firstcell = $cells.eq(0),
					$secondcell = $cells.eq(1);
				return $firstcell.text() == 'post-1' && $secondcell.text() == 'post-1';
			});

			runs(function () {
				// Update the value of the nested row
				grid.setItem(1, {
					id: 1,
					data: {
						id: 1,
						count: 1
					},
					rows: {
						0: {
							id: 2,
							data: {
								id: 2,
								count: 2
							}
						}
					}
				});
			});

			// Wait until postprocessing has re-rendered the row with the updated value
			waitsFor(function () {
				var $cells = grid.$el.find('.doby-grid-cell'),
					$firstcell = $cells.eq(0),
					$secondcell = $cells.eq(1);
				return $firstcell.text() == 'post-1' && $secondcell.text() == 'post-2';
			}, 500);
		});


		// ==========================================================================================


		it("should be able to hide a cached column", function () {
			var grid = resetGrid({
				columns: [{
					cache: true,
					id: 'count',
					name: 'count',
					field: 'count',
					postprocess: function (data, callback) {
						data.$cell.html('post-' + data.data.data.count);
						callback();
					}
				}],
				data: [{
					id: 1,
					data: {
						id: 1,
						count: 1
					}
				}]
			});

			// Wait until postprocessing has rendered the row
			waitsFor(function () {
				var $cells = grid.$el.find('.doby-grid-cell'),
					$firstcell = $cells.eq(0),
					$secondcell = $cells.eq(1);
				return $firstcell.text() == 'post-1';
			}, 50);

			runs(function () {
				grid.hideColumn('count');
			});
		});
	});


	// ==========================================================================================


	describe("options.category", function () {
		it("should be null by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.category).toEqual(null);
			});
		});


		// ==========================================================================================


		it("should groups columns by their category in the context menu", function () {
			var category_a = "Default",
				category_b = "Another";

			var grid = resetGrid($.extend(defaultData(), {
				columns: [
					{id: 'id', field: 'id', name: 'id', category: category_a},
					{id: 'name', field: 'name', name: 'name', category: category_a},
					{id: 'id2', field: 'id2', name: 'id2', category: category_b},
					{id: 'name2', field: 'name2', name: 'name2', category: category_b}
				]
			}));

			// Bring up the context menu
			grid.$el.find('.doby-grid-cell').simulate('contextmenu');

			waitsFor(function () {
				// I'm not sure why this is necessary, but without it we see like 16 context menus come up
				return $(document.body).find('.doby-grid-dropdown').length === 1;
			});

			runs(function () {
				var item_a = $(document.body).find('.doby-grid-dropdown-item .doby-grid-dropdown-item:contains(\'' + category_a + '\')'),
					item_b = $(document.body).find('.doby-grid-dropdown-item .doby-grid-dropdown-item:contains(\'' + category_b + '\')');

				// Find a dropdown item for all the cagetories
				expect(item_a.length).toEqual(1);
				expect(item_b.length).toEqual(1);

				// Close dropdowns
				$(document.body).find('.doby-grid-dropdown').remove();
			});
		});
	});


	// ==========================================================================================


	describe("options.class", function () {
		it("should be null by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.class).toEqual(null);
			});
		});


		// ==========================================================================================


		it("should correctly apply the class to all cells of a column", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [
					{id: 'id', field: 'id', name: 'id', class: 'id'},
					{id: 'name', field: 'name', name: 'name', class: 'name'}
				]
			}));

			grid.$el.find('.doby-grid-row').each(function () {
				$(this).find('.doby-grid-cell').each(function (i) {
					expect($(this).hasClass(grid.options.columns[i].class)).toEqual(true);
				});
			});
		});


		// ==========================================================================================


		it("should be able to use a class function", function () {
			var myFunction = function (row, cell, value, columnDef, data) {
				return [row, cell, value, columnDef.id, data.id].join('-');
			}, columns = [
				{id: 'id', field: 'id', name: 'id', class: myFunction},
				{id: 'name', field: 'name', name: 'name', class: myFunction}
			], grid = resetGrid($.extend(defaultData(), {
				columns: columns
			})), value;

			grid.$el.find('.doby-grid-row').each(function (row) {
				$(this).find('.doby-grid-cell').each(function (cell) {
					value = grid.collection.items[row].data[columns[cell].field];
					expect($(this)).toHaveClass([
						row, cell, value, columns[cell].id, grid.collection.items[row].id
					].join('-'));
				});
			});
		});
	});


	// ==========================================================================================


	describe("options.comparator", function () {
		it("should be null by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.comparator).toEqual(null);
			});
		});


		// ==========================================================================================


		it("should use the defined comparator when sorting by that column", function () {
			var used = false;
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					field: 'id'
				}, {
					id: 'name',
					field: 'name',
					comparator: function (a, b) {
						used = true;
						return a < b;
					}
				}]
			}));

			// Sort by name
			grid.sortBy('name');

			// Make sure the comparator was used
			expect(used).toEqual(true);
		});
	});


	// ==========================================================================================


	describe("options.dataExtractor", function () {
		it("should be null by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.dataExtractor).toEqual(null);
			});
		});


		// ==========================================================================================


		it("should use the defined dataExtractor for that column", function () {
			var used = false;
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					field: 'id'
				}, {
					id: 'name',
					field: 'name',
					dataExtractor: function (item) {
						used = true;
						return item.data.id;
					}
				}]
			}));

			// Make sure function is called
			expect(used).toEqual(true);

			// Make sure the data is extracted correction
			var $cells;
			grid.$el.find('.doby-grid-row').each(function () {
				$cells = $(this).children('.doby-grid-cell');
				$cells.each(function () {
					expect($(this).text()).toEqual($cells.eq(0).text());
				});
			});
		});
	});


	// ==========================================================================================


	describe("options.editable", function () {
		it("should be null by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.editable).toEqual(null);
			});
		});


		// ==========================================================================================


		it("should correctly override the global grid default", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					field: 'id'
				}, {
					id: 'name',
					field: 'name',
					editable: false
				}],
				editable: true
			}));

			var rows = grid.$el.find('.doby-grid-row');

			rows.each(function () {
				$(this).children('.doby-grid-cell').each(function (i) {
					if (i === 0) {
						// Make sure all cells in first column are editable
						$(this).simulate("dblclick");
						expect($(this)).toContain("input");
					} else {
						// But all cells in second column are not
						$(this).simulate("dblclick");
						expect($(this)).not.toContain("input");
					}
				});
			});
		});


		// ==========================================================================================


		it("should have no effect on editing if the editable Grid Option is disabled", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					field: 'id',
					editable: true
				}, {
					id: 'name',
					field: 'name',
					editable: true
				}],
				editable: false
			}));

			var rows = grid.$el.find('.doby-grid-row');

			rows.each(function () {
				$(this).children('.doby-grid-cell').each(function () {
					// Clicking on cells should not do anything
					$(this).simulate("dblclick");
					expect($(this)).not.toContain("input");
				});
			});
		});
	});


	// ==========================================================================================


	describe("options.editor", function () {
		it("should be null by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.editor).toEqual(null);
			});
		});


		// ==========================================================================================


		it("should throw an exception is given something other than a function", function () {
			_.each([1, 'test', [], {}], function (test, i) {
				expect(function () {
					resetGrid($.extend(defaultData(), {
						columns: [{
							id: i,
							editor: test
						}]
					}));
				}).toThrow('Column editors must be functions. Invalid editor given for column "' + i + '"');
			});
		});
	});


	// ==========================================================================================


	describe("options.exporter", function () {
		it("should be null by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.exporter).toEqual(null);
			});
		});


		// ==========================================================================================


		it("should throw an exception is given something other than a function", function () {
			_.each([1, 'test', [], {}], function (test, i) {
				expect(function () {
					resetGrid($.extend(defaultData(), {
						columns: [{
							id: i,
							exporter: test
						}]
					}));
				}).toThrow('Column exporters must be functions. Invalid exporter given for column "' + i + '"');
			});
		});
	});


	// ==========================================================================================


	describe("options.filterable", function () {
		it("should be true by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.filterable).toEqual(true);
			});
		});


		// ==========================================================================================


		it("should gray out the Quick Filter section for non-filterable columns", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [
					{id: 'id', field: 'id', name: 'id', filterable: false},
					{id: 'name', field: 'name', name: 'name'}
				],
				quickFilter: true
			}));

			// Toggle the Quick Filter by accessing it from the menu
			grid.$el.find('.doby-grid-cell:first').simulate('contextmenu');
			$(document.body).find('.doby-grid-contextmenu').find('.doby-grid-dropdown-item .doby-grid-dropdown-item ').each(function () {
				if ($(this).text().indexOf('Quick Filter by') >= 0) {
					$(this).simulate('click');
					return false;
				}
			});
			var quickFilter = grid.$el.find('.doby-grid-header-filter');

			// First field should be disabled, but not second
			quickFilter.find('.doby-grid-header-filter-cell').each(function (i) {
				if (i === 0) {
					expect($(this)).toBeEmpty();
				} else {
					expect($(this)).toContain('.doby-grid-editor');
				}
			});

			// Close dropdowns
			$(document.body).find('.doby-grid-dropdown').remove();
		});
	});


	// ==========================================================================================


	describe("options.focusable", function () {
		it("should be true by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.focusable).toEqual(true);
			});
		});


		// ==========================================================================================


		it("should not allow any cells in the column to be activated when disabled", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					field: 'id',
					focusable: false
				}, {
					id: 'name',
					field: 'name',
					focusable: true
				}]
			}));

			var rows = grid.$el.find('.doby-grid-row');

			rows.each(function () {
				$(this).children('.doby-grid-cell').each(function (i) {
					$(this).simulate("click");

					if (i === 0) {
						// Clicking on cells should not make them active for first column
						expect($(this).attr('class')).not.toContain('active');
					} else {
						// But should for the second
						expect($(this).attr('class')).toContain('active');
					}
				});
			});
		});
	});


	// ==========================================================================================


	describe("options.formatter", function () {
		it("should be null by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.formatter).toEqual(null);
			});
		});


		// ==========================================================================================


		it("should be bound to the grid's instance", function () {
			var scope = [],
				grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					field: 'id',
					name: 'id',
					formatter: function () {
						scope.push(this);
					}
				}, {
					id: 'name',
					field: 'name',
					name: 'name',
					formatter: function () {
						scope.push(this);
					}
				}]
			}));

			_.each(scope, function (s) {
				expect(s).toEqual(grid);
			});
		});


		// ==========================================================================================


		it("should throw an exception is given something other than a function", function () {
			_.each([1, 'test', [], {}], function (test, i) {
				expect(function () {
					resetGrid($.extend(defaultData(), {
						columns: [{
							id: i,
							formatter: test
						}]
					}));
				}).toThrow('Column formatters must be functions. Invalid formatter given for column "' + i + '"');
			});
		});
	});


	// ==========================================================================================


	describe("options.groupable", function () {
		it("should be true by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.groupable).toEqual(true);
			});
		});


		// ==========================================================================================


		it("should throw an error when attempting to group by an un-groupable column", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					field: 'id',
					groupable: false
				}]
			}));

			// Attempt to group via addGrouping()
			expect(function () {
				grid.addGrouping('id');
			}).toThrow('Cannot add grouping for column "id" because "options.groupable" is disabled for that column.');

			// Attempt to group via setGrouping()
			expect(function () {
				grid.setGrouping([{column_id: 'id'}]);
			}).toThrow('Cannot add grouping for column "id" because "options.groupable" is disabled for that column.');
		});
	});


	// ==========================================================================================


	describe("options.headerClass", function () {
		it("should be null by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.headerClass).toEqual(null);
			});
		});


		// ==========================================================================================


		it("should correctly add a CSS class to the header of that column", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					field: 'id',
					headerClass: "asd123"
				}, {
					id: 'name',
					field: 'name'
				}]
			}));

			var headers = grid.$el.find('.doby-grid-header-column');
			expect(headers.eq(0).attr('class')).toContain('asd123');
			expect(headers.eq(1).attr('class')).not.toContain('asd123');
		});
	});


	// ==========================================================================================


	describe("options.id", function () {
		it("should be auto-generated if not specified", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					field: 'id'
				}, {
					name: 'name'
				}]
			}));


			_.each(grid.options.columns, function (col, i) {
				if (i === 0) {
					expect(col.id).toEqual('id_0');
				} else {
					expect(col.id).toEqual('name_1');
				}
			});
		});
	});


	// ==========================================================================================


	describe("options.maxWidth", function () {
		it("should be null by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.maxWidth).toEqual(null);
			});
		});


		// ==========================================================================================


		it("should not allow resizing of the columns beyond the maxWidth value", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					field: 'id',
					maxWidth: 100
				}, {
					id: 'name',
					field: 'name',
					maxWidth: 200
				}]
			}));

			// Grag the column headers
			var headers = grid.$el.find('.doby-grid-header-column'),
				handle;

			// Simulate a drag
			headers.each(function (i) {

				// Grab the handle
				handle = $(this).find('.doby-grid-resizable-handle');

				// Start dragging
				handle.simulate('drag', {dx: 500});

				// Ensure widths didn't get bigger than allowed
				if (i === 0) {
					expect($(this).outerWidth()).toEqual(100);
				} else {
					expect($(this).outerWidth()).toEqual(200);
				}
			});
		});
	});


	// ==========================================================================================


	describe("options.minWidth", function () {
		it("should be 42 by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.minWidth).toEqual(42);
			});
		});


		// ==========================================================================================


		it("should not allow resizing of the columns beyond the minWidth value", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					field: 'id',
					minWidth: 100
				}, {
					id: 'name',
					field: 'name',
					minWidth: 200
				}]
			}));

			// Grag the column headers
			var headers = grid.$el.find('.doby-grid-header-column'),
				handle;

			// Ensure initial width is the min width
			_.each(grid.options.columns, function (col, i) {
				if (i === 0) {
					expect(col.width).toEqual(100);
				} else {
					expect(col.width).toEqual(200);
				}
			});

			// Simulate a drag
			headers.each(function (i) {

				// Grab the handle
				handle = $(this).find('.doby-grid-resizable-handle');

				// Start dragging
				handle.simulate('drag', {dx: -500});

				// Ensure widths didn't get bigger than allowed
				if (i === 0) {
					expect($(this).outerWidth()).toEqual(100);
				} else {
					expect($(this).outerWidth()).toEqual(200);
				}
			});
		});
	});


	// ==========================================================================================


	describe("options.postprocess", function () {
		it("should be null by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.postprocess).toEqual(null);
			});
		});


		// ==========================================================================================


		it("should execute postprocessing on column cells when enabled", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					name: 'id',
					postprocess: function (data, callback) {
						data.$cell.html("I'm a little teapot");
						callback();
					}
				}]
			}));


			// Check to see if all cells are loaded
			var cells = grid.$el.find('.doby-grid-cell');

			// Expect everything to be empty
			cells.each(function () {
				expect($(this).text()).toEqual('');
			});

			// Wait until postprocessing has rendered everything
			waitsFor(function () {
				var result = true;
				cells.each(function () {
					if ($(this).text() === '') result = false;
				});
				return result;
			});

			runs(function () {
				// Expect cells to have new data
				cells.each(function () {
					expect($(this).text()).toEqual("I'm a little teapot");
				});
			});
		});
	});


	// ==========================================================================================


	describe("options.removable", function () {
		it("should be false by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.removable).toEqual(false);
			});
		});


		// ==========================================================================================


		it("should throw an exception when attempting to remove a column that is not removable", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					removable: true
				}, {
					id: 'name',
					removable: false
				}]
			}));

			// Removing first column should be no problem
			grid.removeColumn('id');

			// Removing second column should throw an exception
			expect(function () {
				grid.removeColumn('name');
			}).toThrow('Cannot remove column "name" because it is not removable.');

		});
	});


	// ==========================================================================================


	describe("options.rerenderOnResize", function () {
		it("should be false by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.rerenderOnResize).toEqual(false);
			});
		});


		// ==========================================================================================


		it("should re-render values on column resize", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [{
					id: 'id',
					field: 'id',
					rerenderOnResize: true,
					formatter: function () {
						return new Date().toString() + '-' + new Date().getMilliseconds();
					}
				}]
			}));

			// Get the rendered value of column
			var valueBefore = grid.$el.find('.doby-grid-cell').first().text();

			// Resize column
			grid.$el.find('.doby-grid-header-column').each(function () {
				$(this).find('.doby-grid-resizable-handle').simulate('drag', {dx: -100});
			});

			// Expect the value to have changed
			var valueAfter = grid.$el.find('.doby-grid-cell').first().text();
			expect(valueBefore).not.toEqual(valueAfter);
		});
	});


	// ==========================================================================================


	describe("options.resizable", function () {
		it("should be true by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.resizable).toEqual(true);
			});
		});


		// ==========================================================================================


		it("should not draw resize handles on columns which have resizing disabled", function () {
			// Prepare for test
			var grid = resetGrid($.extend(defaultData(), {
				columns: [
					{id: 'id', field: 'id'},
					{id: 'id2', resizable: false, field: 'id2'},
					{id: 'id3', field: 'id3'},
					{id: 'id4', resizable: false, field: 'id4'}
				],
				resizableColumns: true
			}));

			// Check to make sure all the right columns have handles
			grid.$el.find('.doby-grid-header-column').each(function (i) {
				if (i % 2) {
					expect($(this).children('.doby-grid-resizable-handle').length).toEqual(0);
				} else {
					expect($(this).children('.doby-grid-resizable-handle').length).toEqual(1);
				}
			});
		});
	});


	// ==========================================================================================


	describe("options.selectable", function () {
		it("should be true by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.selectable).toEqual(true);
			});
		});


		// ==========================================================================================


		it("should not allow cell range selection when disabled", function () {
			// Prepare for test
			var grid = resetGrid($.extend(defaultData(), {
				selectable: true,
				columns: [
					{id: 'id', selectable: false, field: 'id'}
				]
			}));

			// Find the first and last cells
			var firstcell = grid.$el.find('.doby-grid-row:first .doby-grid-cell:first'),
				lastcell = grid.$el.find('.doby-grid-row:last .doby-grid-cell:last');

			// Get the drag delta from the first cell
			var dy = firstcell.position().top - lastcell.position().top + lastcell.height(),
				dx = lastcell.position().left - firstcell.position().left + lastcell.width();

			// Simulate a click and drag on the cell ranges
			firstcell.simulate('drag', {dx: dx, dy: dy});

			// Expect the first and last cells to be selected
			expect(grid.selection).toEqual(null);
		});
	});


	// ==========================================================================================


	describe("options.sortable", function () {
		it("should be true by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.sortable).toEqual(true);
			});
		});


		// ==========================================================================================


		it("should throw an exception when attempting to sort by an unsortable column", function () {
			var grid = resetGrid($.extend(defaultData(), {
				selectable: true,
				columns: [
					{id: 'id', sortable: false, field: 'id'}
				]
			}));

			expect(function () {
				grid.sortBy('id');
			}).toThrow('Doby Grid cannot sort by "id" because that column is not sortable.');
		});
	});


	// ==========================================================================================


	describe("options.sortAsc", function () {
		it("should be true by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.sortAsc).toEqual(true);
			});
		});


		// ==========================================================================================


		it("should use this value as a default sorting direction", function () {
			var grid = resetGrid($.extend(defaultData(), {
				selectable: true,
				columns: [
					{id: 'id', sortAsc: false, field: 'id'}
				],
				data: [
					{id: 1, data: {id: 1}},
					{id: 2, data: {id: 2}},
					{id: 3, data: {id: 3}}
				]
			}));

			// Sort!
			grid.sortBy('id');

			// Make sure we're in reverse order
			expect(grid.collection.items[0].id).toEqual(3);
			expect(grid.collection.items[2].id).toEqual(1);
		});
	});


	// ==========================================================================================


	describe("options.tooltip", function () {
		it("should be null by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.tooltip).toEqual(null);
			});
		});
	});


	// ==========================================================================================


	describe("options.visible", function () {
		it("should be true by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.visible).toEqual(true);
			});
		});


		// ==========================================================================================


		it("should not render invisible columns", function () {
			var grid = resetGrid($.extend(defaultData(), {
				columns: [
					{id: 'id', name: 'One', field: 'id'},
					{id: 'id2', name: 'Two', visible: false, field: 'id'},
					{id: 'id3', name: 'Three', field: 'id'},
					{id: 'id4', name: 'Four', visible: false, field: 'id'}
				]
			}));

			// Check what was rendered
			grid.$el.find('.doby-grid-header-column').each(function (i) {
				if (i === 0) {
					expect($(this).text()).toContain('One');
				} else {
					expect($(this).text()).toContain('Three');
				}
			});
		});
	});


	// ==========================================================================================


	describe("options.width", function () {
		it("should inherit from the 'columnWidth' Grid Option by default", function () {
			var grid = resetGrid(defaultData());
			_.each(grid.options.columns, function (col) {
				expect(col.width).toEqual(grid.options.columnWidth);
			});
		});
	});
});