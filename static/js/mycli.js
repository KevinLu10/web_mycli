var ACTIONS = {
    'INIT_CONNECT' : 'INIT_CONNECT',
    'CLOSE_CONNECT': 'CLOSE_CONNECT',
    'RUN_QUERY'    : 'RUN_QUERY',
    'ERROR'        : 'ERROR',
    'GET_COMPLETER': 'GET_COMPLETER'
}
function WebSocketData(action, data, pid) {
    this.action = action
    this.data = data
    this.pid = pid
}

// action 说明
var MycliShell = {
    "is_start"       : 0,                                       //MycliShell status 1 if start else 0
    "pid"            : undefined,                                  // the id of one connection
    "url"            : "/mycli_websocket",   //the url of websocket connection
    "command_history": [],                            	//command used
    "command_cursor" : 0								//this position of cursor
};
var maxcount = 0;
var thisCount = 0;
var raw_text = '';//user input when showing the completer
var pre_cursor_position = 0//thie cursor position before user select a completer
var is_completer_div_show = false //is the completer div showing
//create CMD line

//custom alert;change it if you like
function custom_alert(msg, level) {
    alert(msg)
}
MycliShell.create_mycli_command_line = function (game_info) {
    var _html = [];
    _html.push('<table class="mycli_line">');
    _html.push('    <tr>');
    _html.push('        <td  class="mycli_num" style="padding-right: 5px;white-space: nowrap;">' + game_info, '></td>');
    _html.push('        <td class="mycli_str">');
    _html.push('            <input class="mycli_command_line" id="mycli_command_line" >');
    _html.push('        </td>');
    _html.push('    </tr>');
    _html.push('</table>');
    _html.push('<table class="mycli_line">');
    _html.push('    <tr ><td colspan="2" id="mycli_result" style="color: yellowgreen;"></td></tr>');
    _html.push('</table>');
    $("#mycli_div").append(_html.join(''));
    $("#mycli_command_line").focus();
    div = $('#mycli_div')[0] //.animate({scrollTop: $("#mycli_div").height()}, 'quick');
    total_height = 0
    $("#mycli_div table").each(function (i, v) {
        total_height += $(v).height()
    })
    div.scrollTop = total_height
};
MycliShell.print_line_result = function (data, is_error) {
    font_color = is_error ? '#FF5722' : 'yellowgreen'
    var tr = $("#mycli_result").parent().parent()
    tr_html = ''
    for (var i in data) {
        td_html = '<pre style="white-space: pre" >' + data[i] + '</pre>'
        tr_html += '<td  style="color: ' + font_color + ';overflow:hidden;padding-right:10px">' + td_html + '</td>'
    }
    tr.append('<tr >' + tr_html + '</tr>')

}
MycliShell.bind_mycli_command_line_keypress = function () {

    $("#mycli_command_line").bind("keydown", function (event) {
        var keycode = event.keyCode ? event.keyCode : event.which;
        if (is_completer_div_show && (keycode == 9)) {
            MycliShell.handle_completer_keyup(event)
            return false;
        }
//        $("#mycli_command_line").focus()
//        event.returnValue = false;

    })
    $("#mycli_command_line").bind("keyup", function (event) {
        var keycode = event.keyCode ? event.keyCode : event.which;
        if (is_completer_div_show && (keycode == 38 || keycode == 40 || keycode == 13 || keycode == 27)) {
            if (!MycliShell.handle_completer_keyup(event))
                return
        }
        switch (keycode) {
            //Enter key
            //send query to  websocket
            case 13:
                query = $("#mycli_command_line").val();
                if (query) {
                    websocket_data = new WebSocketData(ACTIONS.RUN_QUERY, query, MycliShell.pid)
                    MycliShell.websocket.send(JSON.stringify(websocket_data))
                    $("#run_status").show()

                }
                else {
                    MycliShell.reset_mycli_command_line_keypress();
                    MycliShell.create_mycli_command_line(MycliShell.game_info);
                    MycliShell.bind_mycli_command_line_keypress();
                }
                return false;
                break;
            //direction key UP
            //get command history
            case 38:
                if (MycliShell.command_history.length > 0) {
                    if (MycliShell.command_cursor >= MycliShell.command_history.length) {
                        MycliShell.command_cursor = MycliShell.command_history.length - 1;
                    }
                    if (!(MycliShell.command_cursor == 0 && $("#mycli_command_line").val() != MycliShell.command_history[MycliShell.command_cursor]))
                        MycliShell.command_cursor++;
                    $("#mycli_command_line").val(MycliShell.command_history[MycliShell.command_cursor]);

                }
                break;
            //direction key DOWN
            //get command history
            case 40:
                if (MycliShell.command_history.length > 0) {
                    if (MycliShell.command_cursor <= 0) {
                        MycliShell.command_cursor = 0;
                        $("#mycli_command_line").val("");
                    }
                    else {
                        MycliShell.command_cursor--;
                        $("#mycli_command_line").val(MycliShell.command_history[MycliShell.command_cursor]);

                    }
                }
                break;
            case 9:
                break;
            default:
                MycliShell.get_completer()
                break;
        }

    });
};

MycliShell.reset_mycli_command_line_keypress = function () {
    $('#mycli_command_line').unbind('keyup');
    $('#mycli_command_line').attr('disabled', true)
    $('#mycli_command_line').attr({"id": "", "contenteditable": "false", "background-color": "#333333"});
    $('#mycli_result').attr({"id": ""});
};


//start  mycli_shell
MycliShell.mysql_shell_start = function () {
    MycliShell.pid = Date.parse(new Date());
    MycliShell.status = 2;
    MycliShell.command_history = [];
    MycliShell.command_cursor = 0;
    $("#mycli_div").html('<div id="status" style="float: right">&nbsp;</div>');
    MycliShell.create_mycli_command_line(MycliShell.game_info);
    MycliShell.bind_mycli_command_line_keypress();
    $("#mycli_div").css({"background-color": "#333333"});
    MycliShell.change_btn_status('disconnect')

};
MycliShell.change_btn_status = function (status) {
    if (status == 'connecting') {
        $(".action-type").html("Connecting");

    } else if (status == 'connect') {
        $(".action-type").html("Connect");
        icon = $(".action-icon").removeClass()
        icon.addClass('glyphicon').addClass('glyphicon-play').addClass('action-icon')
    } else {
        $(".action-type").html("Disconnect");
        icon = $(".action-icon").removeClass()
        icon.addClass('glyphicon').addClass('glyphicon-stop').addClass('action-icon')
    }
}
// stop mycli_shell
MycliShell.mysql_shell_stop = function () {
    MycliShell.websocket.close()
    MycliShell.pid = undefined;
    MycliShell.status = 1;
    MycliShell.mochiweb_url = ''
    MycliShell.change_btn_status('connect')
    $("#mycli_div").css({"background-color": "#EDEDED"});
    MycliShell.reset_mycli_command_line_keypress();
    $(window).unbind('beforeunload');
    $("#mycli_div").html("");
    MycliShell.is_start = 0
};

//init myclishell  ;do this function when the html ready
MycliShell.init = function (hook) {
    $("#" + hook).click(function () {
        if (MycliShell.is_start == 1) {
            MycliShell.mysql_shell_stop();
            websocket_data = new WebSocketData(ACTIONS.CLOSE_CONNECT, '', MycliShell.pid)
            MycliShell.websocket.send(JSON.stringify(websocket_data))
            return false;
        }
        if (!($("#mysql_host").val() && $("#mysql_port").val() && $("#mysql_user").val() && $("#mysql_pwd").val())) {
            custom_alert('Please input mysql_host and mysql_port and mysql_user and mysql_pwd')
        }
        MycliShell.mysql_ip = $("#mysql_host").val()
        MycliShell.mysql_port = $("#mysql_port").val()
        MycliShell.mysql_user = $("#mysql_user").val()
        MycliShell.mysql_pwd = $("#mysql_pwd").val()

        MycliShell.websocket = new WebSocket("ws://" + window.location.host + MycliShell.url);
        MycliShell.change_btn_status('connecting')
        MycliShell.websocket.onopen = function () {
            MycliShell.websocket.onmessage = function (evt) {
                MycliShell.handle_websocket_data(evt)
            }
            data = JSON.stringify({
                mysql_ip  : MycliShell.mysql_ip,
                mysql_port: MycliShell.mysql_port,
                mysql_user: MycliShell.mysql_user,
                mysql_pwd : MycliShell.mysql_pwd,
            })
            websocket_data = new WebSocketData(ACTIONS.INIT_CONNECT, data, '', MycliShell.pid)
            MycliShell.websocket.send(JSON.stringify(websocket_data))
        }
        MycliShell.websocket.onclose = function (event) {
            custom_alert('disconnect', 'error')

            MycliShell.mysql_shell_stop();
        };
        MycliShell.websocket.onerror = function (event) {
            custom_alert('connect fail', 'error')
            MycliShell.mysql_shell_stop();
        };


    });
};


MycliShell.get_completer = function () {
    query = $("#mycli_command_line").val();
    raw_text = query
    websocket_data = new WebSocketData(ACTIONS.GET_COMPLETER, query, MycliShell.pid)
    websocket_data.cursor_position = get_selection_end($("#mycli_command_line")[0])
    MycliShell.websocket.send(JSON.stringify(websocket_data))
}

//get thie cursor position of a object
function get_selection_end(o) {
    if (o.createTextRange) {
        var r = document.selection.createRange().duplicate()
        r.moveStart('character ', -o.value.length)
        return r.text.length
    } else return o.selectionEnd

}

//handle the data from backend server
MycliShell.handle_websocket_data = function (evt) {
    data = JSON.parse(evt.data)
    if (data.action == ACTIONS.INIT_CONNECT) {
        if (data.data == 'ok') {
            MycliShell.handle_init_success(data)
        } else {
            custom_alert(data.data, 'info')
            MycliShell.mysql_shell_stop()
        }
    }
    else if (data.action == ACTIONS.RUN_QUERY) {
        MycliShell.handle_run_query(data)
    }
    else if (data.action == ACTIONS.GET_COMPLETER) {
        MycliShell.handle_completer(data)
    }
}


MycliShell.handle_init_success = function (data) {
    MycliShell.mysql_username = data.mysql_username
    MycliShell.game_info = MycliShell.mysql_username + '@' + MycliShell.mysql_ip
    MycliShell.is_start = 1;
    MycliShell.access = ''
    custom_alert('connect success', 'info')
    MycliShell.mysql_shell_start();

    $("#run_status").hide()

}

MycliShell.handle_completer = function (data) {
    data_list_html = ''
    var completions = data.data;
    var offset = $("#mycli_command_line").offset();
    $("#completer").show();
    is_completer_div_show = true
    $("#completer").css("top", (offset.top + $("#mycli_command_line").height()) + "px");
    $("#completer").css("left", (offset.left + get_selection_end($("#mycli_command_line")[0]) * 6.5) + "px");
    var Candidate = "";
    pre_cursor_position = parseInt(data.cursor_position)

    thisCount = 0;
    maxcount = 0;
    console.debug(completions)
    $.each(completions, function (k, v) {
        maxcount++;
        Candidate += "<li start_position='" + v.start_position + "' id='" + maxcount + "'>" + v.text + "</li>";

    });
    $("#completer").html(Candidate);
//    event.preventDefault();
    $("#completer li").click(function (e) {
        thisCount = parseInt(this.id);
        MycliShell.fill_completer((thisCount))
        MycliShell.hide_completer()
    });

    $("#completer li").hover(function () {
        $("#completer li").css("background", "#008787");
        $("#completer li:eq(" + (this.id - 1) + ")").css("background", "#00afaf");
    }, function () {
        $("#completer li").css("background", "#008787");
    });

}

MycliShell.handle_run_query = function (data) {
    $("#run_status").hide()
    result = data.data
    if (result.result == 'ok') {
        MycliShell.print_line_result([result.data], false)
    } else {
        MycliShell.print_line_result([result.data], true)

    }
    if (data.db) {
        MycliShell.db = data.db
        MycliShell.game_info = MycliShell.mysql_username + '@' + MycliShell.mysql_ip + ' ' + data.db
    }
    MycliShell.reset_mycli_command_line_keypress();
    MycliShell.create_mycli_command_line(MycliShell.game_info);
    MycliShell.bind_mycli_command_line_keypress();

    MycliShell.command_history.unshift(query);
    MycliShell.command_cursor = 0;
}

//handle the key event when completer working
MycliShell.handle_completer_keyup = function (event) {
    v = event.which
    // direction key - UP
    if (v == 38)
    {
        if (thisCount > 0) {
            --thisCount
            MycliShell.fill_completer(thisCount)
            $("#completer li").css("background", "#008787");
            li_count = thisCount - 1
            $("#completer li:eq(" + li_count + ")").css("background", "#00afaf");

        }
    }
    //direction key - DOWN
    else if (v == 40) {
        if (thisCount < maxcount) {
            ++thisCount;
            MycliShell.fill_completer(thisCount)
            $("#completer li").css("background", "#008787");
            li_count = thisCount - 1
            $("#completer li:eq(" + li_count + ")").css("background", "#00afaf");
        }
    }
    // Enter key
    else if (v == 13) {
        if (thisCount == 0) {
            MycliShell.hide_completer()
            //can not handle here ,return to upstream
            return true
        }

        MycliShell.fill_completer(thisCount)
        MycliShell.hide_completer()
    }
    // Tab key
    else if (v == 9) {
        if (thisCount == 0) {
            thisCount = 1
        }
        MycliShell.fill_completer(thisCount)
        MycliShell.hide_completer()
    } else if (v == 27)  // ESC key
    {
        MycliShell.hide_completer()
    }
    return false


}
//fill the complete msg into the input line
MycliShell.fill_completer = function (thisCount) {
    cursor_position = pre_cursor_position
    complete_text = $("#" + thisCount).text()
    start_position = parseFloat($("#" + thisCount).attr('start_position'))
    replace_start = cursor_position + start_position
    replace_end = raw_text.indexOf(' ', replace_start)
    if (replace_end == -1) {
        replace_end = raw_text.length
    }
    new_text = raw_text.substring(0, replace_start) + complete_text + raw_text.substring(replace_end, raw_text.length)
    $("#mycli_command_line").val(new_text)
}
MycliShell.hide_completer = function () {
    is_completer_div_show = false
    $("#completer").html("");
    $("#completer").hide();
}

