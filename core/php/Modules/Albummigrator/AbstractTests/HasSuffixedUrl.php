<?php
namespace Slimpd\Modules\Albummigrator\AbstractTests;
use Slimpd\Utilities\RegexHelper as RGX;
/* Copyright (C) 2015-2016 othmar52 <othmar52@users.noreply.github.com>
 *
 * This file is part of sliMpd - a php based mpd web client
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
 * for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

 /**
  * patterns:
  *   "Phil - Http://www.myspace.com/philippmller"
  *   "Joyce Rooks http://www.myspace.com/joycerooks"
  *   "Mr. Zu : http://www.deepindub.org/staff/mr-zu/"
  *   "Mr. Zu - http://www.deepindub.org/staff/mr-zu/"
  *   "Christoph Schindling - http://www.myspace.com/christophschindling"
  */
abstract class HasSuffixedUrl extends \Slimpd\Modules\Albummigrator\AbstractTests\AbstractTest {

    public function __construct($input, &$trackContext, &$albumContext, &$jumbleJudge) {

        parent::__construct($input, $trackContext, $albumContext, $jumbleJudge);
        $this->pattern = "/^" . RGX::ANYTHING . "(?:[^ ])(?:\ [-:])?" . RGX::GLUE . RGX::URL . "$/";
        return $this;
    }

    public function run() {
        if(preg_match($this->pattern, $this->input, $matches)) {
            $this->result = "has-suffixed-url";
            $this->matches = $matches;
            return;
        }
        $this->result = 0;
    }
}
