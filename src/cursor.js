"use strict";
/*
   Copyright (C) 2012 by Jeremy P. White <jwhite@codeweavers.com>

   This file is part of spice-html5.

   spice-html5 is free software: you can redistribute it and/or modify
   it under the terms of the GNU Lesser General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   spice-html5 is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Lesser General Public License for more details.

   You should have received a copy of the GNU Lesser General Public License
   along with spice-html5.  If not, see <http://www.gnu.org/licenses/>.
*/

import { create_rgba_png } from './png.js';
import { Constants } from './enums.js';
import { DEBUG } from './utils.js';
import {
  SpiceMsgCursorInit,
  SpiceMsgCursorSet,
} from './spicemsg.js';
import { SpiceSimulateCursor } from './simulatecursor.js';
import { SpiceConn } from './spiceconn.js';

/*----------------------------------------------------------------------------
**  SpiceCursorConn
**      Drive the Spice Cursor Channel
**--------------------------------------------------------------------------*/
function SpiceCursorConn()
{
    SpiceConn.apply(this, arguments);
}

SpiceCursorConn.prototype = Object.create(SpiceConn.prototype);
SpiceCursorConn.prototype.process_channel_message = function(msg)
{
    if (msg.type == Constants.SPICE_MSG_CURSOR_INIT)
    {
        var cursor_init = new SpiceMsgCursorInit(msg.data);
        DEBUG > 1 && console.log("SpiceMsgCursorInit");
        if (this.parent && this.parent.inputs &&
            this.parent.inputs.mouse_mode == Constants.SPICE_MOUSE_MODE_SERVER)
        {
            // FIXME - this imagines that the server actually
            //          provides the current cursor position,
            //          instead of 0,0.  As of May 11, 2012,
            //          that assumption was false :-(.
            this.parent.inputs.mousex = cursor_init.position.x;
            this.parent.inputs.mousey = cursor_init.position.y;
        }
        // FIXME - We don't handle most of the parameters here...
        return true;
    }

    if (msg.type == Constants.SPICE_MSG_CURSOR_SET)
    {
        var cursor_set = new SpiceMsgCursorSet(msg.data);
        DEBUG > 1 && console.log("SpiceMsgCursorSet");
        if (cursor_set.flags & Constants.SPICE_CURSOR_FLAGS_NONE)
        {
            this.parent.screen_dom.style.cursor = "none";
            return true;
        }

        if (cursor_set.flags > 0)
            this.log_warn("FIXME: No support for cursor flags " + cursor_set.flags);

        if (cursor_set.cursor.header.type != Constants.SPICE_CURSOR_TYPE_ALPHA)
        {
            this.log_warn("FIXME: No support for cursor type " + cursor_set.cursor.header.type);
            return false;
        }

        this.set_cursor(cursor_set.cursor);

        return true;
    }

    if (msg.type == Constants.SPICE_MSG_CURSOR_MOVE)
    {
        this.known_unimplemented(msg.type, "Cursor Move");
        return true;
    }

    if (msg.type == Constants.SPICE_MSG_CURSOR_HIDE)
    {
        DEBUG > 1 && console.log("SpiceMsgCursorHide");
        this.parent.screen_dom.style.cursor = "none";
        return true;
    }

    if (msg.type == Constants.SPICE_MSG_CURSOR_TRAIL)
    {
        this.known_unimplemented(msg.type, "Cursor Trail");
        return true;
    }

    if (msg.type == Constants.SPICE_MSG_CURSOR_RESET)
    {
        DEBUG > 1 && console.log("SpiceMsgCursorReset");
        this.parent.screen_dom.style.cursor = "auto";
        return true;
    }

    if (msg.type == Constants.SPICE_MSG_CURSOR_INVAL_ONE)
    {
        this.known_unimplemented(msg.type, "Cursor Inval One");
        return true;
    }

    if (msg.type == Constants.SPICE_MSG_CURSOR_INVAL_ALL)
    {
        DEBUG > 1 && console.log("SpiceMsgCursorInvalAll");
        // FIXME - There may be something useful to do here...
        return true;
    }

    return false;
}

SpiceCursorConn.prototype.set_cursor = function(cursor)
{
    var pngstr = create_rgba_png(cursor.header.width, cursor.header.height, cursor.data);
    var curstr = 'url(data:image/png,' + pngstr + ') ' +
        cursor.header.hot_spot_x + ' ' + cursor.header.hot_spot_y + ", default";
    var screen = this.parent.screen_dom;
    screen.style.cursor = 'auto';
    screen.style.cursor = curstr;
    if (window.getComputedStyle(screen, null).cursor == 'auto')
        SpiceSimulateCursor.simulate_cursor(this, cursor, screen, pngstr);
}

export {
  SpiceCursorConn,
};
