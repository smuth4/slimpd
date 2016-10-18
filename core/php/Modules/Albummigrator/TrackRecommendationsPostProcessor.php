<?php
namespace Slimpd\Modules\Albummigrator;
use \Slimpd\Utilities\RegexHelper as RGX;
/* Copyright (C) 2016 othmar52 <othmar52@users.noreply.github.com>
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

class TrackRecommendationsPostProcessor {

	public static function postProcess($setterName, $value, &$contextItem) {
		if(method_exists(__CLASS__, $setterName) === FALSE) {
			// we dont have a post processer for this property
			return;
		} 
		self::$setterName($value, $contextItem);
	}

	private static function setArtist($value, &$contextItem) {
		// "A01. Master of Puppets"
		if(preg_match("/^" . RGX::MAY_BRACKET . RGX::VINYL . RGX::MAY_BRACKET . RGX::GLUE . RGX::ANYTHING . "$/i", $value, $matches)) {
			$contextItem->recommendations["setTrackNumber"][] = strtoupper($matches[1]);
			$contextItem->recommendations["setArtist"][] = $matches[2];
		}
		// "1. Master of Puppets"
		if(preg_match("/^" . RGX::MAY_BRACKET . RGX::NUM . RGX::MAY_BRACKET . RGX::GLUE . RGX::ANYTHING . "$/i", $value, $matches)) {
			$contextItem->recommendations["setTrackNumber"][] = removeLeadingZeroes($matches[1]);
			$contextItem->recommendations["setArtist"][] = $matches[2];
		}
	}

	private static function setTitle($value, &$contextItem) {
		if(preg_match("/^" . RGX::MAY_BRACKET . RGX::VINYL . RGX::MAY_BRACKET . RGX::GLUE . RGX::ANYTHING . "$/i", $value, $matches)) {
			$contextItem->recommendations["setTrackNumber"][] = strtoupper($matches[1]);
			$contextItem->recommendations["setTitle"][] = $matches[2];
		}
		if(preg_match("/^" . RGX::MAY_BRACKET . RGX::NUM . RGX::MAY_BRACKET . RGX::GLUE . RGX::ANYTHING . "$/i", $value, $matches)) {
			$contextItem->recommendations["setTrackNumber"][] = removeLeadingZeroes($matches[1]);
			$contextItem->recommendations["setTitle"][] = $matches[2];
		}
	}

	private static function setTrackNumber($value, &$contextItem) {
		if(isset($value[0]) && $value[0] === "0") {
			$contextItem->recommendations["setTrackNumber"][] = removeLeadingZeroes($value);
		}
	}
}