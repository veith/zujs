/**
 * Extends Tc Module with zuizz rest features
 *
 * @author Veith
 * @namespace Tc
 */

Tc.zu = {};
(function ($) {

    Tc.zu._bind_helper = function ($ctx, class_id) {
        // Use a jQuery object as simple observer
        var observer = jQuery({});

        // add two classes in ui element i.e tc-log tc-log-label  for 
        var class_selector = ".tc-" + class_id,
            message = class_id + ":ui-change";

        // Listen to change events on elements with the tc-[class_id] class and proxy
        // them to the observer, so that the change is "broadcasted" to all connected objects

        $ctx.on("ui-change", class_selector, function () {
            var $input = jQuery(this);
            var attr_name = this.className.match(new RegExp('tc-' + class_id + '-(\\w+)'))[1];
            if ($input.is("input:radio")) {
                observer.trigger(message, [ attr_name, $('input.' + 'tc-' + class_id + '-' + attr_name + ':checked', $ctx).val(), $input ]);
            } else if ($input.is("input:checkbox")) {
                var vals = [];
                $('input.' + 'tc-' + class_id + '-' + attr_name + ':checked', $ctx).map(function () {
                    vals.push($(this).val());
                });
                observer.trigger(message, [ attr_name, vals, $input ]);
            } else if ($input.is("input, textarea, select")) {
                observer.trigger(message, [ attr_name, $input.val(), $input ]);
            } else {
                observer.trigger(message, [ attr_name, $input.html(), $input ]);
            }
        });

        // observer propagates changes to all bound elements, setting value of
        // input tags or HTML content of other tags
        observer.on(message, function (evt, prop_name, new_val, initiator) {
            jQuery(class_selector + class_selector + '-' + prop_name, $ctx).each(function () {
                var $bound = jQuery(this);
                // auslöser nicht aktualisieren
                if ($bound.get(0) !== initiator.get(0)) {
                    if ($bound.is("input:radio")) {

                        $('input' + class_selector + class_selector + '-' + prop_name + '[value=' + new_val + ']',$ctx).attr("checked", "checked");
                    } else if ($bound.is("input, textarea, select")) {
                        $bound.val(new_val);
                    } else {
                        $bound.html(new_val);
                    }
                }
            });
        });
        return observer;
    };

    /**
     * Bind UI to model. Access your data directly with model.attributes or with get
     * @param $ctx
     * @param class_id
     * @param data
     * @returns {{observer: Tc.zu._bind_helper, attributes: {}, data: Function, set: Function, get: Function, onChange: Function}}
     */
    Tc.zu.bind = function ($ctx, class_id, data) {
        var model = {
            observer: new Tc.zu._bind_helper($ctx, class_id),
            modified_attributes: {},
            attributes: {},
            fields: {},
            hasChanges :false,
            debounceTreshhold: 500,
            data: function (fields) {
                model.modified_attributes = {};
                model.fields = {};
                for (var key in fields) {
                    model.attributes[key] = fields[key];
                    model.observer.trigger(class_id + ":ui-change", [ key, fields[key], this ]);
                    if (model.fields[key] == undefined) {
                        model.fields[key] = {};
                    }
                }
            },
            // The attribute setter publish changes using the observer observer
            set: function (attr_name, val) {
                model.observer.trigger(class_id + ":ui-change", [ attr_name, val, this ]);
                model._updateAttribute(attr_name, val)
            },
            get: function (attr_name) {
                return this.attributes[ attr_name ];
            },
            // called before fields onChange
            onChange: function (key, value) {

            },
            // called after fields onChange
            onChangeAfterFields: function (key, value) {

            },
            _init: function (class_id, ctx) {
                $('.tc-' + class_id, ctx).each(function (i, e) {
                    var element = $(e);
                    var key = "ui-change-value";
                    var debouncedTrigger = model._debounce(function () {
                        element.trigger("ui-change");
                    });

                    if (element.is("select, input:radio, input:checkbox")) {

                        element.on("change", function () {
                            element.trigger("ui-change");
                        });
                    }

                    element.on("keydown", function () {
                        if ($.data(e, key) === undefined) {
                            $.data(e, key, element.val());
                        }
                    });
                    element.on("keyup", function () {
                        var val = $.data(e, key);
                        if (element.is("input, textarea, select")) {
                            var inputval = element.val();
                        } else {
                            var inputval = element.html();
                        }

                        if (val !== undefined && inputval !== val) {
                            $.removeData(e, key);
                            debouncedTrigger();
                            //element.trigger("ui-change");
                        }

                    });
                });

            }, _debounce: function (func) {
                var timeout;
                if (model.debounceTreshhold == 0) {
                    return func;
                } else {
                    return function debounced() {
                        var obj = this, args = arguments;

                        function delayed() {
                            func.apply(obj, args);
                            timeout = null;
                        }

                        if (timeout) {
                            clearTimeout(timeout);
                        }
                        timeout = setTimeout(delayed, model.debounceTreshhold);
                    };
                }

            },
            _updateAttribute: function (attr_name, val) {
                this.modified_attributes[ attr_name ] = val;
                this.hasChanges = true;
                this.attributes[ attr_name ] = val;
                model.onChange(attr_name, val);
                // callback for single attributes
                if (model.fields[attr_name] != undefined && typeof(model.fields[attr_name].onChange) == "function") {
                    model.fields[attr_name].onChange(attr_name, val);
                }
                model.onChangeAfterFields(attr_name, val);
            },
            // read form data and update attributes
            _readForm:function(class_id,$ctx){

                $(".tc-" + class_id,$ctx).each(
                function () {
                    var $input = jQuery(this);
                    var attr_name = this.className.match(new RegExp('tc-' + class_id + '-(\\w+)'))[1];
                    if ($input.is("input:radio")) {
                        model.modified_attributes[attr_name] = $('input.' + 'tc-' + class_id + '-' + attr_name + ':checked', $ctx).val();
                        model.attributes[attr_name] = $('input.' + 'tc-' + class_id + '-' + attr_name + ':checked', $ctx).val();
                    } else if ($input.is("input:checkbox")) {
                        var vals = [];
                        $('input.' + 'tc-' + class_id + '-' + attr_name + ':checked', $ctx).map(function () {
                            vals.push($(this).val());
                        });
                        model.modified_attributes[attr_name] = vals;
                        model.attributes[attr_name]= vals;

                    } else if ($input.is("input, textarea, select")) {
                        model.modified_attributes[attr_name] = $input.val();
                        model.attributes[attr_name] = $input.val();

                    } else {
                        model.modified_attributes[attr_name] = $input.html();
                        model.attributes[attr_name] = $input.html();

                    }
                });
            }


        };

        model._init(class_id, $ctx);

        // Subscribe to the observer
        model.observer.on(class_id + ":ui-change", function (evt, attr_name, new_val, initiator) {
            if (model.get(0) !== initiator.get(0)) {
                model._updateAttribute(attr_name, new_val);
            }
        });

        // fill the form with data
        if (typeof (data) == "object") {
            model.data(data);
        }else{
        // read the form data
            model._readForm(class_id, $ctx);
        }

        return model;
    };

    Tc.zu.rest =
        function (resourceURI) {
            this.URI = resourceURI; // /rest/com.zuizz.user.users

            this.init = function () {
                this.Id = null;
                this.Mimetype = {'search': 'json', 'list': 'json', 'entity': 'json'};
                this.Page = {'search': 0, 'list': 0};
                this.NumOfPages = {'search': 0, 'list': 0};
                this.Limit = {'search': 10, 'list': 10};
                this.Fields = {'search': 'id', 'list': 'id', 'entity': 'id'};
                this.Expand = {'search': '', 'list': '', 'entity': ''};
                this.Scope = {'search': {}, 'list': {}};
                this.DataType = {'search': 'json', 'list': 'json', 'entity': 'json'};
                this.JsonpCallback = {'search': null, 'list': null, 'entity': null};

                this.modified_attributes = {};

                if (localStorage[this.URI + '_sort_list'] == undefined) {
                    localStorage[this.URI + '_sort_list'] = 'id';

                }

                if (localStorage[this.URI + '_sort_search'] == undefined) {
                    localStorage[this.URI + '_sort_search'] = 'id';

                }

                this.Sort = {
                    'search': localStorage[this.URI + '_sort_search'],
                    'list': localStorage[this.URI + '_sort_list']
                };


            };
            this.init();


            /**
             * Get a specific item from resource
             *
             * @method resGet
             * @param {id} identifier Resource identifier
             * @param {object} statusCode Callback functions for status codes
             * @param {array} additional_data (optional)
             * @return void
             */
            this.get = function (identifier, statusCode, additional_data) {
                this.Id = identifier;

                if (typeof (additional_data) == "object") {
                    var data = additional_data;
                    data.fields = this.Fields.entity;
                    data.expand = this.Expand.entity;
                }
                $.ajax({
                    url: this.URI + this.Id + '.' + this.Mimetype.entity,
                    type: 'GET',
                    dataType: this.DataType.entity,
                    resourceDataType: this.JsonpCallback.entity,
                    data: data,
                    'statusCode': statusCode
                });
            };


            /**
             * Search a list from resource
             *
             * @method restList
             * @param {string} query Search term
             * @param {object} statusCode Callback functions for status codes
             * @param {array} additional_data (optional)
             * @param {int} page (optional)
             * @return void
             */
            this.search = function (query, statusCode, additional_data, page) {

                var data = {};
                if (page != undefined) {
                    if (typeof (additional_data) != "object") {
                        this.Page.list = data;
                    }
                }

                if (typeof (additional_data) == "object") {
                    data = additional_data;
                }
                data.q = query;
                data.fields = this.Fields.search;
                data.expand = this.Expand.search;
                data.page = this.Page.search;
                data.limit = this.Limit.search;
                data.scope = this.Scope.search;
                data.sort = this.Sort.search;


                var self = this;
                if (statusCode[200] != undefined) {
                    statusCode['t200'] = statusCode[200];
                }

                statusCode[200] = function (r) {
                    if (r.metadata != undefined) {
                        self.page.search = r.metadata.page;
                        self.NumOfPages.search = r.metadata.pages;
                    }
                    if (statusCode[200] != undefined) {
                        statusCode['t200'](r);
                    }
                };

                $.ajax({
                    'url': this.URI + '.' + this.Mimetype.search,
                    'type': 'GET',
                    'dataType': this.DataType.search,
                    'resourceDataType': this.JsonpCallback.search,
                    'data': data,
                    'statusCode': statusCode
                });
            };

            /**
             * Receive a list from resource
             * @method restList
             * @param {object} statusCode Callback functions for status codes
             * @param {array} additional_data (optional)
             * @param {int} page (optional)
             * @return void
             */
            this.list = function (statusCode, additional_data, page) {

                var data = {};
                if (page != undefined) {
                    if (typeof (additional_data) != "object") {
                        this.Page.list = data;
                    }
                }

                if (typeof (additional_data) == "object") {
                    data = additional_data;
                }

                data.fields = this.Fields.list;
                data.expand = this.Expand.list;
                data.page = this.Page.list;
                data.limit = this.Limit.list;
                data.scope = this.Scope.list;
                data.sort = this.Sort.list;


                var self = this;
                if (statusCode[200] != undefined) {
                    statusCode['t200'] = statusCode[200];
                }

                statusCode[200] = function (r) {
                    if (r.metadata != undefined) {
                        if (self.page != undefined && r.metadata.page != undefined) {
                            self.page.list = r.metadata.page;
                        }
                        if (self.NumOfPages != undefined && r.metadata.pages != undefined) {
                            self.NumOfPages.list = r.metadata.pages;
                        }

                    }
                    if (statusCode[200] != undefined) {
                        statusCode['t200'](r);
                    }
                };

                $.ajax({
                    'url': this.URI + '.' + this.Mimetype.list,
                    'type': 'GET',
                    'dataType': this.DataType.list,
                    'resourceDataType': this.JsonpCallback.list,
                    'data': data,
                    'statusCode': statusCode
                });
            };

            this.add = function (fields, statusCode) {
                var self = this;
                $.ajax({
                    url: this.URI + '.' + this.Mimetype.entity,
                    type: 'POST',
                    resourceDataType: this.JsonpCallback.entity,
                    data: fields,
                    'statusCode': statusCode
                });

            };
            this.post_file = function (fields, statusCode) {

            };

            this.update = function (fields, statusCode) {
                this.set(fields);
                this.save(statusCode)
            };
            // for multiple saves on the same ressource
            this.reset_attributes = function ( ) {
                    this.modified_attributes= {};
            };

            this.set = function (fields) {
                for (var key in fields) {
                    // The key is key
                    this.modified_attributes[key] = fields[key];
                }
            };
            this.save = function (statusCode) {
                var self = this;
                $.ajax({
                    url: this.URI + this.Id + '.' + this.Mimetype.entity,
                    type: 'PUT',
                    resourceDataType: this.JsonpCallback.entity,
                    data: self.modified_attributes,
                    'statusCode': statusCode
                });


            };

            this.destroy = function (identifier, statusCode, additional_data) {

                if (typeof (additional_data) == "object") {
                    var data = additional_data;
                }

                $.ajax({
                    url: this.URI + identifier + '.' + this.Mimetype.entity,
                    type: 'DELETE',
                    dataType: this.DataType.entity,
                    resourceDataType: this.JsonpCallback.entity,
                    data: data,
                    'statusCode': statusCode
                });

            };

            this.setScope = function (scope, requestType) {  // like  {'running': 1, 'age': ['gt',8], 'name': ['contains','Vei']}
                if (requestType != undefined) {
                    this.Scope[requestType] = scope;
                } else {
                    this.Scope.list = scope;
                    this.Scope.search = scope;
                }


            };

            this.defineFields = function (fields, requestType) { //string like  id,email,more
                if (requestType != undefined) {
                    this.Fields [requestType] = fields;
                } else {
                    this.Fields.list = fields;
                    this.Fields.search = fields;
                }
            };
            this.defineExpands = function (blocks, requestType) { //string like block1(*),block3(id,email)
                if (requestType != undefined) {
                    this.Expand [requestType] = blocks;
                } else {
                    this.Expand.list = blocks;
                    this.Expand.search = blocks;
                }
            };

            this.setListSort = function (sort) {
                this.Sort.list = sort;
                localStorage[this.URI + '_sort_list'] = sort;
            }
            this.setSearchSort = function (sort) {
                this.Sort.search = sort;
                localStorage[this.URI + '_sort_search'] = sort;
            }
            this.setListLimit = function (numOfItems) {
                this.resourceLimit.list = numOfItems;
            };
            this.setSearchLimit = function (numOfItems) {
                this.resourceLimit.search = numOfItems;
            };

            this.setPrevPage = function (requestType) {
                if (requestType != undefined) {
                    if (this.resourcePage[requestType] > 0) {
                        this.resourcePage[requestType]--;
                    }
                } else {
                    if (this.resourcePage[requestType] > 0) {
                        this.resourcePage.list--;
                        this.resourcePage.search--;
                    }
                }
            };

            this.setNextPage = function (requestType) {
                if (requestType != undefined) {
                    if (this.resourcePage[requestType] < this.resourceNumOfPages[requestType]) {
                        this.resourcePage[requestType]++;
                    }
                } else {
                    if (this.resourcePage[requestType] < this.resourceNumOfPages[requestType]) {
                        this.resourcePage.list++;
                        this.resourcePage.search++;
                    }
                }
            };

            this.setPage = function (page, requestType) {
                if (requestType != undefined) {
                    this.resourcePage[requestType] = page;
                } else {
                    this.resourcePage.list = page;
                    this.resourcePage.search = page;
                }
            };
        };

})(Tc.$);


(function ($) {
    "use strict";
    Tc.Module = Tc.Module.extend({
        errorhandler: {
            _g: {},
            set: function (group, element, is_faulty) {
                var e = this;
                if (e._g[group] == undefined) {
                    e._g[group] = {};
                }
                e._g[group][element] = is_faulty;

            },
            check: function (group) {
                var e = this, c = false;
                if (e._g[group] != undefined) {
                    $.each(e._g[group], function (index, value) {
                        c = c || value;
                    });
                    return !c;
                } else {
                    return c;
                }
            }

        },
        autobutton: function () {
            var $ctx = this.$ctx,
                self = this;
            $ctx.on('click', '.tcb', function () {
                var action = this.className.match(/tcb-\w+/g);
                var button = this;
                var i = 0;
                if (action != null) {
                    for (i; i < action.length; i++) {
                        if (typeof(self[action[i]]) == "function") {
                            self[action[i]](button);
                        }
                    }
                }
            });
        },
        resetFormFields: function (class_id) {

            var $ctx = this.$ctx,
                self = this;


            if(class_id == undefined){
                class_id = '*';
            }else{
                class_id = '.tc-' + class_id;
            }


            $(class_id, $ctx).each(function () {

                var type = this.type;

                var tag = this.tagName.toLowerCase(); // normalize case
                // it's ok to reset the value attr of text inputs,
                // password inputs, and textareas
                if (type == 'text' || type == 'password' || tag == 'textarea') {
                    this.value = "";
                }
                // checkboxes and radios need to have their checked state cleared
                // but should *not* have their 'value' changed
                else if (type == 'checkbox' || type == 'radio') {
                    this.checked = false;
                }
                // select elements need to have their 'selectedIndex' property set to -1
                // (this works for both single and multiple select elements)
                else if (tag == 'select') {
                    this.selectedIndex = -1;
                } else if (tag == 'span') {
                    $(this).html('');
                }

            });
        },
        initDot: function () {
            var $ctx = this.$ctx,
                self = this;
            self.dot = {};

            $('script', $ctx).each(function (i, e) {
                var dot = $(e);
                self.dot[dot.attr('name')] = doT.template(dot.html());
            });

        },
        debounce: function (func, threshold, execAtBeginning) {
            var timeout;
            return function debounced() {
                var obj = this, args = arguments;

                function delayed() {
                    if (!execAtBeginning) {
                        func.apply(obj, args);
                    }
                    timeout = null;
                }

                if (timeout) {
                    clearTimeout(timeout);
                }
                else if (execAtBeginning) {
                    func.apply(obj, args);
                }

                timeout = setTimeout(delayed, threshold || 500);
            };
        },
        initKeys: function () {
            this.KEY = {
                TAB: 9,
                ENTER: 13,
                ESC: 27,
                SPACE: 32,
                LEFT: 37,
                UP: 38,
                RIGHT: 39,
                DOWN: 40,
                SHIFT: 16,
                CTRL: 17,
                ALT: 18,
                PAGE_UP: 33,
                PAGE_DOWN: 34,
                HOME: 36,
                END: 35,
                BACKSPACE: 8,
                DELETE: 46,
                isArrow: function (k) {
                    k = k.which ? k.which : k;
                    switch (k) {
                        case KEY.LEFT:
                        case KEY.RIGHT:
                        case KEY.UP:
                        case KEY.DOWN:
                            return true;
                    }
                    return false;
                },
                isControl: function (e) {
                    var k = e.which;
                    switch (k) {
                        case KEY.SHIFT:
                        case KEY.CTRL:
                        case KEY.ALT:
                            return true;
                    }

                    if (e.metaKey) return true;

                    return false;
                },
                isFunctionKey: function (k) {
                    k = k.which ? k.which : k;
                    return k >= 112 && k <= 123;
                }
            };
        }


    });
})(Tc.$);