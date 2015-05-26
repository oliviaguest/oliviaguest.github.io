




/*
     FILE ARCHIVED ON 4:45:51 Dec 23, 2014 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 13:05:26 May 16, 2015.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/

/* Merged Plone Javascript file
 * This file is dynamically assembled from separate parts.
 * Some of these parts have 3rd party licenses or copyright information attached
 * Such information is valid for that section,
 * not for the entire composite file
 * originating files are separated by - filename.js -
 */

/* - dropdown.js - */
// /web/20141223044551/http://babylab.psy.ox.ac.uk/portal_javascripts/dropdown.js?original=1
function hideAllMenus(){jq('dl.actionMenu').removeClass('activated').addClass('deactivated')};
function toggleMenuHandler(event){jq(this).parents('.actionMenu:first').toggleClass('deactivated').toggleClass('activated');return false};
function actionMenuDocumentMouseDown(event){if(jq(event.target).parents('.actionMenu:first').length)
return true;hideAllMenus()};
function actionMenuMouseOver(event){var menu_id=jq(this).parents('.actionMenu:first').attr('id');if(!menu_id) return true;var switch_menu=jq('dl.actionMenu.activated').length>0;jq('dl.actionMenu').removeClass('activated').addClass('deactivated');if(switch_menu)
jq('#'+menu_id).removeClass('deactivated').addClass('activated')};
function initializeMenus(){jq(document).mousedown(actionMenuDocumentMouseDown);hideAllMenus();jq('dl.actionMenu dt.actionMenuHeader a').click(toggleMenuHandler).mouseover(actionMenuMouseOver);jq('dl.actionMenu > dd.actionMenuContent').click(hideAllMenus)};jq(initializeMenus);

/* - table_sorter.js - */
// /web/20141223044551/http://babylab.psy.ox.ac.uk/portal_javascripts/table_sorter.js?original=1
function sortable(a){if(a.charAt(4)!='-'&&a.charAt(7)!='-'&&!isNaN(parseFloat(a)))
return parseFloat(a);return a.toLowerCase()}
function sort(){var name=jq(this).text();var table=jq(this).parents('table:first');var tbody=table.find('tbody:first');var reverse=table.attr('sorted')==name;jq(this).parent().find('th:not(.nosort) img.sortdirection').attr('src',portal_url+'/arrowBlank.gif');jq(this).children('img.sortdirection').attr('src',portal_url+(reverse?'/arrowDown.gif':'/arrowUp.gif'));var index=jq(this).parent().children('th').index(this);var data=[];tbody.find('tr').each(function(){var cells=jq(this).children('td');data.push([sortable(cells.slice(index,index+1).text()),sortable(cells.slice(1,2).text()),sortable(cells.slice(0,1).text()),this])});if(data.length){data.sort();if(reverse) data.reverse();table.attr('sorted',reverse?'':name);tbody.append(jq.map(data, function(a){return a[3]}));tbody.find('tr').removeClass('odd').removeClass('even').filter(':odd').addClass('even').end().filter(':even').addClass('odd')}}
jq(function(){var blankarrow=jq('<img>').attr('src',portal_url+'/arrowBlank.gif').attr('width',6).attr('height',9).addClass('sortdirection');jq('table.listing:not(.nosort) thead th:not(.nosort)').append(blankarrow.clone()).css('cursor','pointer').click(sort).slice(0,1).find('img.sortdirection').attr('src',portal_url+'/arrowUp.gif')});

/* - calendar_formfield.js - */
// /web/20141223044551/http://babylab.psy.ox.ac.uk/portal_javascripts/calendar_formfield.js?original=1
if(typeof(plone)=='undefined')
var plone={};plone.jscalendar={_calendar:null,_current_input:null,_field_names:['year','month','day','hour','minute','ampm'],_fields: function(selector){if(selector===undefined) selector=plone.jscalendar._current_input;var fields={field:jq(selector)};jq.each(plone.jscalendar._field_names, function(){fields[this]=jq(selector+'_'+this)});return fields},init: function(){jq('.plone_jscalendar > input:hidden').each(function(){var selector='#'+this.id;jq.each(plone.jscalendar._fields(selector), function(){this.filter('select').bind('change.plone.jscalendar',{selector:selector},plone.jscalendar.update_hidden)})})},show: function(input_id,yearStart,yearEnd){var cal=plone.jscalendar._cal;if(!cal){cal=plone.jscalendar._cal=new Calendar(1,null,plone.jscalendar.handle_select,plone.jscalendar.handle_close);cal.create()} else
cal.hide();if(arguments.length>3){cal.params={range:[arguments[7],arguments[8]],inputField:jq('#'+arguments[1]).get(0),input_id_year:jq('#'+arguments[2]).get(0),input_id_month:jq('#'+arguments[3]).get(0),input_id_day:jq('#'+arguments[4]).get(0)};var anchor=jq('#'+arguments[0]);cal.setRange(cal.params.range[0],cal.params.range[1]);window.calendar=cal;var fields={year:jq(cal.params.input_id_year),month:jq(cal.params.input_id_month),day:jq(cal.params.input_id_day)}} else{plone.jscalendar._current_input=input_id;var fields=plone.jscalendar._fields();var anchor=fields.month;cal.setRange(yearStart,yearEnd)}
if(fields.year.val()>0) cal.date.setFullYear(fields.year.val());if(fields.month.val()>0) cal.date.setMonth(fields.month.val()-1);if(fields.day.val()>0) cal.date.setDate(fields.day.val());cal.refresh();cal.showAtElement(anchor.get(0),null);return false},handle_select: function(cal,date){if(cal.params!==undefined){var fields={year:jq(cal.params.input_id_year),month:jq(cal.params.input_id_month),day:jq(cal.params.input_id_day)}} else
var fields=plone.jscalendar._fields();var yearValue=date.substring(0,4);if(jq.nodeName(fields.year.get(0),'select')&&!fields.year.children('option[value='+yearValue+']').length){var options=fields.year.get(0).options;for(var i=options.length;i--;i>0){if(options[i].value>yearValue)
options[i+1]=new Option(options[i].value,options[i].text);else{options[i+1]=new Option(yearValue,yearValue);break}}}
fields.year.val(yearValue);fields.month.val(date.substring(5,7));fields.day.val(date.substring(8,10));if(cal.params!==undefined){var inputField=jq(cal.params.inputField);inputField.val(date+inputField.val().substr(10))} else
plone.jscalendar.update_hidden()},handle_close: function(cal){if(cal.params!==undefined) cal.params=window.calendar=undefined;cal.hide()},update_hidden: function(e){var val='';if(arguments.length>1)
var f={field:jq('#'+arguments[0]),year:jq('#'+arguments[1]),month:jq('#'+arguments[2]),day:jq('#'+arguments[3]),hour:jq('#'+arguments[4]),minute:jq('#'+arguments[5]),ampm:jq('#'+arguments[6])};else
var f=plone.jscalendar._fields(e&&e.data.selector);if((arguments.length>1&&f.year.val()==0)||(e&&e.target.selectedIndex===0)){var type=arguments.length==1&&e.target.id.substr(e.data.selector.length);var filter=jq.inArray(type,['hour','minute','ampm'])>-1?'select[id$=hour],select[id$=minute],select[id$=ampm]':'select';jq.each(f, function(){this.filter(filter).attr('selectedIndex',0)})} else if(f.year.val()>0&&f.month.val()>0&&f.day.val()>0){val=[f.year.val(),f.month.val(),f.day.val()].join('-');var date=new Date(val.replace(/-/g,'/'));if(date.print('%Y-%m-%d')!=val){val=date.print('%Y-%m-%d');f.year.val(val.substring(0,4));f.month.val(val.substring(5,7));f.day.val(val.substring(8,10))}
if(f.hour.length&&f.minute.length){val+=" "+[f.hour.val(),f.minute.val()].join(':');if(f.ampm.length) val+=" "+f.ampm.val()}}
f.field.val(val)}};jq(plone.jscalendar.init);var showJsCalendar=plone.jscalendar.show;var onJsCalendarDateUpdate=plone.jscalendar.handle_select;var update_date_field=plone.jscalendar.update_hidden;

/* - formUnload.js - */
// /web/20141223044551/http://babylab.psy.ox.ac.uk/portal_javascripts/formUnload.js?original=1
if(!window.beforeunload)(function(){var BeforeUnloadHandler=function(){var self=this;this.message=window.form_modified_message||"Discard changes? If you click OK, any changes you have made will be lost.";this.forms=[];this.chkId=[];this.chkType=new this.CheckType();this.handlers=[this.isAnyFormChanged];this.submitting=false;this.execute=function(event){var domforms=jq('form');self.forms=jq.grep(self.forms, function(form){return domforms.index(form)>-1});if(self.submitting) return;var message;jq.each(self.handlers, function(i,fn){message=message||fn.apply(self)});if(message===true) message=self.message;if(message===false) message=undefined;if(event&&message) event.returnValue=message;return message}
this.execute.tool=this}
var Class=BeforeUnloadHandler.prototype;Class.isAnyFormChanged=function(){for(var i=0;form=this.forms[i++];){if(this.isElementChanged(form))
return true}
return false}
Class.addHandler=function(fn){this.handlers.push(fn)}
Class.onsubmit=function(){var tool=window.onbeforeunload&&window.onbeforeunload.tool;tool.submitting=true;plone.UnlockHandler.submitting=true}
Class.addForm=function(form){if(jq.inArray(form,this.forms)>-1) return;this.forms.push(form);jq(form).submit(this.onsubmit);var elements=form.getElementsByTagName('input');jq(form).find('input:hidden').each(function(){var value=this.defaultValue;if(value!==undefined&&value!==null)
jq(this).attr('originalValue',value.replace(/\r\n?/g,'\n'))})}
Class.addForms=function(){var self=this;jq.each(arguments, function(){if(this.tagName.toLowerCase()=='form')
self.addForm(this);else
self.addForms.apply(self,jq(this).find('form').get())})}
Class.removeForms=function(){var self=this;jq.each(arguments, function(){if(this.tagName.toLowerCase()=='form'){var el=this;self.forms=jq.grep(self.forms, function(form){return form!=el});jq(element).unbind('submit',self.onsubmit)} else
self.removeForms.apply(self,jq(this).find('form').get())})}
Class.CheckType=function(){};var c=Class.CheckType.prototype;c.checkbox=c.radio=function(ele){return ele.checked!=ele.defaultChecked}
c.file=c.password=c.textarea=c.text=function(ele){return ele.value!=ele.defaultValue}
c.hidden=function(ele){var orig=jq(ele).attr('originalValue');if(orig===undefined||orig===null) return false;return jq(ele).val().replace(/\r\n?/g,'\n')!=orig}
c['select-one']=function(ele){for(var i=0;opt=ele[i++];){if(opt.selected!=opt.defaultSelected){if(i===1&&opt.selected) continue;return true}}
return false}
c['select-multiple']=function(ele){for(var i=0;opt=ele[i++];){if(opt.selected!=opt.defaultSelected)
return true}
return false}
Class.chk_form=function(form){var elems=jq(form).find('> :input:not(.noUnloadProtection),'+':not(.noUnloadProtection) :input:not(.noUnloadProtection)');for(var i=0;element=elems.get(i++);){if(this.isElementChanged(element))
return true}
return false}
Class.isElementChanged=function(ele){var method=ele.id&&this.chkId[ele.id];if(!method&&ele.type&&ele.name)
method=this.chkType[ele.type];if(!method&&ele.tagName)
method=this['chk_'+ele.tagName.toLowerCase()];return method?method.call(this,ele):false};window.onbeforeunload=new BeforeUnloadHandler().execute;jq(function(){var tool=window.onbeforeunload&&window.onbeforeunload.tool;var content=getContentArea();if(tool&&content)
tool.addForms.apply(tool,jq('form.enableUnloadProtection').get())})})();

/* - formsubmithelpers.js - */
// /web/20141223044551/http://babylab.psy.ox.ac.uk/portal_javascripts/formsubmithelpers.js?original=1
function inputSubmitOnClick(event){if(jq(this).hasClass('submitting')&&!jq(this).hasClass('allowMultiSubmit'))
return confirm(window.form_resubmit_message);else
jq(this).addClass('submitting')}
jq(function(){jq(':submit').each(function(){if(!this.onclick)
jq(this).click(inputSubmitOnClick)})});

/* - unlockOnFormUnload.js - */
// /web/20141223044551/http://babylab.psy.ox.ac.uk/portal_javascripts/unlockOnFormUnload.js?original=1
if(typeof(plone)=='undefined')
var plone={};plone.UnlockHandler={init: function(){if(jq('form.enableUnlockProtection').length){jq(window).unload(plone.UnlockHandler.execute);plone.UnlockHandler._refresher=setInterval(plone.UnlockHandler.refresh,300000)}},cleanup: function(){jq(window).unbind('unload',plone.UnlockHandler.execute);clearInterval(plone.UnlockHandler._refresher)},execute: function(){if(this.submitting) return;jq.get(plone.UnlockHandler._baseUrl()+'/@@plone_lock_operations/safe_unlock')},refresh: function(){if(this.submitting) return;jq.get(plone.UnlockHandler._baseUrl()+'/@@plone_lock_operations/refresh_lock')},_baseUrl: function(){var baseUrl=jq('base').attr('href');if(!baseUrl){var pieces=window.location.href.split('/');pieces.pop();baseUrl=pieces.join('/')}
return baseUrl}};jq(plone.UnlockHandler.init);
