<?php
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
$app->get('/filebrowser', function() use ($app, $vars){
	$vars['action'] = 'filebrowser';
	$fileBrowser = new \Slimpd\filebrowser();
	$fileBrowser->getDirectoryContent($vars['mpd']['musicdir']);
	$vars['breadcrumb'] = $fileBrowser->breadcrumb;
	$vars['subDirectories'] = $fileBrowser->subDirectories;
	$vars['files'] = $fileBrowser->files;
	$vars['hotlinks'] = array();
	$vars['hideQuicknav'] = 1;
	foreach(trimExplode("\n", $vars['filebrowser']['hotlinks'], TRUE) as $path){
		$vars['hotlinks'][] =  \Slimpd\filebrowser::fetchBreadcrumb($path);
	}
	
	$app->render('surrounding.htm', $vars);
})->name('filebrowser');

$app->get('/filebrowser/:itemParams+', function($itemParams) use ($app, $vars){
	$vars['action'] = 'filebrowser';
	
	$fileBrowser = new \Slimpd\filebrowser();
	$fileBrowser->itemsPerPage = $app->config['filebrowser']['max-items'];
	$fileBrowser->currentPage = intval($app->request->get('page'));
	$fileBrowser->currentPage = ($fileBrowser->currentPage === 0) ? 1 : $fileBrowser->currentPage;
	switch($app->request->get('filter')) {
		case 'dirs':
			$fileBrowser->filter = 'dirs';
			break;
		case 'files':
			$fileBrowser->filter = 'files';
			break;
		default :
			break;
	}
	
	switch($app->request->get('neighbour')) {
		case 'next':
			$fileBrowser->getNextDirectoryContent(join(DS, $itemParams));
			break;
		case 'prev':
			$fileBrowser->getPreviousDirectoryContent(join(DS, $itemParams));
			break;
		case 'up':
			$fileBrowser->getDirectoryContent(dirname(join(DS, $itemParams)));
			if($fileBrowser->directory === './') {
				$app->response->redirect($app->urlFor('filebrowser') . getNoSurSuffix());
				return;
			}
			break;
		default:
			$fileBrowser->getDirectoryContent(join(DS, $itemParams));
			break;
	}

	$vars['directory'] = $fileBrowser->directory;
	$vars['breadcrumb'] = $fileBrowser->breadcrumb;
	$vars['subDirectories'] = $fileBrowser->subDirectories;
	$vars['files'] = $fileBrowser->files;
	$vars['filter'] = $fileBrowser->filter;
	
	switch($fileBrowser->filter) {
		case 'dirs':
			$totalFilteredItems = $fileBrowser->subDirectories['total'];
			$vars['showDirFilterBadge'] = FALSE;
			$vars['showFileFilterBadge'] = FALSE;
			break;
		case 'files':
			$totalFilteredItems = $fileBrowser->files['total'];
			$vars['showDirFilterBadge'] = FALSE;
			$vars['showFileFilterBadge'] = FALSE;
			break;
		default :
			$totalFilteredItems = 0;
			$vars['showDirFilterBadge'] = ($fileBrowser->subDirectories['count'] < $fileBrowser->subDirectories['total'])
				? TRUE
				: FALSE;
			
			$vars['showFileFilterBadge'] = ($fileBrowser->files['count'] < $fileBrowser->files['total'])
				? TRUE
				: FALSE;
			break;
	}
	
	$vars['paginator'] = new JasonGrimes\Paginator(
		$totalFilteredItems,
		$fileBrowser->itemsPerPage,
		$fileBrowser->currentPage,
		$app->config['root'] . 'filebrowser/'.$fileBrowser->directory . '?filter=' . $fileBrowser->filter . '&page=(:num)'
	);
	$vars['paginator']->setMaxPagesToShow(paginatorPages($fileBrowser->currentPage));
	$app->render('surrounding.htm', $vars);
});


$app->get('/markup/widget-directory/:itemParams+', function($itemParams) use ($app, $vars){
	$vars['action'] = 'filebrowser';
	$fileBrowser = new \Slimpd\filebrowser();

	$fileBrowser->getDirectoryContent(join(DS, $itemParams));
	$vars['directory'] = $fileBrowser->directory;
	$vars['breadcrumb'] = $fileBrowser->breadcrumb;
	$vars['subDirectories'] = $fileBrowser->subDirectories;
	$vars['files'] = $fileBrowser->files;
	
	/// try to fetch album entry for this directory
	$vars['album'] = \Slimpd\Models\Album::getInstanceByAttributes(
		array('relPathHash' => getFilePathHash($fileBrowser->directory))
	);
	$app->render('modules/widget-directory.htm', $vars);
});
