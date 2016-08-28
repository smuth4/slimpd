<?php
namespace Slimpd\Modules\importer;

abstract class AbstractImporter {
	protected $jobBatchId;				// mysql batch record id
	protected $jobId;					// mysql record id
	protected $jobPhase;				// numeric index
	protected $jobBegin;				// tstamp
	protected $jobStatusInterval = 5; 	// seconds
	protected $lastJobStatusUpdate = 0; // timestamp

	// counters needed for calculating estimated time and speed [Tracks/minute]
	protected $itemCountChecked = 0;	
	protected $itemCountProcessed = 0;
	protected $itemCountTotal = 0;

	protected function beginJob($data = array(), $function = '') {
		cliLog("STARTING import phase " . $this->jobPhase . " " . $function . '()', 1, "cyan");
		$app = \Slim\Slim::getInstance();
		$this->jobBegin = getMicrotimeFloat();
		$this->itemCountChecked = 0;
		$this->itemCountProcessed = 0;
		
		$relPath = (isset($data['relPath']) === TRUE)
			? $app->db->real_escape_string($data['relPath'])
			: '';
		//$this->itemCountTotal = 0;
		$query = "INSERT INTO importer
			(batchId, jobPhase, jobStart, jobLastUpdate, jobStatistics, relPath)
			VALUES (
				". $this->getLastBatchId().",
				".(int)$this->jobPhase.",
				". $this->jobBegin.",
				". $this->jobBegin. ",
				'" .serialize($data)."',
				'". $relPath ."')";
		$app->db->query($query);
		$this->jobId = $app->db->insert_id;
		$this->lastJobStatusUpdate = $this->jobBegin;
		if($this->jobPhase !== 0) {
			return;
		}
		$query = "UPDATE importer SET batchId='" .$this->jobId."' WHERE id=" . $this->jobId;
		$app->db->query($query);
	}

	public function updateJob($data = array()) {
		$microtime = getMicrotimeFloat();
		if($microtime - $this->lastJobStatusUpdate < $this->jobStatusInterval) {
			return;
		}

		$data['progressPercent'] = 0;
		$data['microTimestamp'] = $microtime;
		$this->calculateSpeed($data);

		$query = "UPDATE importer
			SET jobStatistics='" .serialize($data)."',
			jobLastUpdate=".$microtime."
			WHERE id=" . $this->jobId;
		\Slim\Slim::getInstance()->db->query($query);
		cliLog('progress:' . $data['progressPercent'] . '%', 1);
		$this->lastJobStatusUpdate = $microtime;
		return;
	}

	protected function finishJob($data = array(), $function = '') {
		cliLog("FINISHED import phase " . $this->jobPhase . " " . $function . '()', 1, "cyan");
		$microtime = getMicrotimeFloat();
		$data['progressPercent'] = 100;
		$data['microTimestamp'] = $microtime;
		$this->calculateSpeed($data);

		$query = "UPDATE importer
			SET jobEnd=".$microtime.",
			jobLastUpdate=".$microtime.",
			jobStatistics='" .serialize($data)."' WHERE id=" . $this->jobId;
		
		\Slim\Slim::getInstance()->db->query($query);
		$this->jobId = 0;
		$this->itemCountChecked = 0;
		$this->itemCountProcessed = 0;
		$this->itemCountTotal = 0;
		$this->lastJobStatusUpdate = $microtime;
		return;
	}

	protected function calculateSpeed(&$data) {
		$data['itemCountChecked'] = $this->itemCountChecked;
		$data['itemCountProcessed'] = $this->itemCountProcessed;
		$data['itemCountTotal'] = $this->itemCountTotal;

		// this spped will be relevant for javascript animated progressbar
		$data['speedPercentPerSecond'] = 0;

		$data['runtimeSeconds'] = $data['microTimestamp'] - $this->jobBegin;
		if($this->itemCountChecked < 1 || $this->itemCountTotal <1) {
			return;
		}

		$seconds = getMicrotimeFloat() - $this->jobBegin;

		$itemsPerMinute = $this->itemCountChecked/$seconds*60;
		$data['speedItemsPerMinute'] = floor($itemsPerMinute);
		$data['speedItemsPerHour'] = floor($itemsPerMinute*60);
		$data['speedPercentPerSecond'] = ($itemsPerMinute/60)/($this->itemCountTotal/100);

		$minutesRemaining = ($this->itemCountTotal - $this->itemCountChecked) / $itemsPerMinute;
		if($data['progressPercent'] !== 0) {
			$data['estimatedRemainingSeconds'] = 0;
			$data['estimatedTotalRuntime'] = $data['runtimeSeconds'];
			return;
		}

		$data['progressPercent'] = floor($this->itemCountChecked / ($this->itemCountTotal/100));
		// make sure we don not display 100% in case it is not finished
		$data['progressPercent'] = ($data['progressPercent']>99) ? 99 : $data['progressPercent'];

		$data['estimatedRemainingSeconds'] = round($minutesRemaining*60);
		$data['estimatedTotalRuntime'] = round($this->itemCountTotal/$itemsPerMinute*60);
	}

	protected function getLastBatchId() {
		$query = "SELECT id FROM importer WHERE jobPhase = 0 ORDER BY id DESC LIMIT 1;";
		$batchId = \Slim\Slim::getInstance()->db->query($query)->fetch_assoc()['id'];
		if($batchId !== NULL) {
			return $batchId;
		}
		return 0;
	}
}
