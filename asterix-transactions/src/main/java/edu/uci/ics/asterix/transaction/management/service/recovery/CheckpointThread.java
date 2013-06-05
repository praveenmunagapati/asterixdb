package edu.uci.ics.asterix.transaction.management.service.recovery;

import java.util.List;

import edu.uci.ics.asterix.common.context.BaseOperationTracker;
import edu.uci.ics.asterix.common.exceptions.ACIDException;
import edu.uci.ics.asterix.common.transactions.IRecoveryManager;
import edu.uci.ics.hyracks.storage.am.common.api.IIndex;
import edu.uci.ics.hyracks.storage.am.common.api.IIndexLifecycleManager;
import edu.uci.ics.hyracks.storage.am.lsm.common.api.ILSMIndex;

public class CheckpointThread extends Thread {

    private long lsnThreshold;
    private long checkpointTermInSecs;

    private long lastMinMCTFirstLSN = 0;

    private final IRecoveryManager recoveryMgr;
    private final IIndexLifecycleManager indexLifecycleManager;

    public CheckpointThread(IRecoveryManager recoveryMgr, IIndexLifecycleManager indexLifecycleManager,
            long lsnThreshold, long checkpointTermInSecs) {
        this.recoveryMgr = recoveryMgr;
        this.indexLifecycleManager = indexLifecycleManager;
        this.lsnThreshold = lsnThreshold;
        this.checkpointTermInSecs = checkpointTermInSecs;
    }

    @Override
    public void run() {
        long currentMinMCTFirstLSN = 0;
        while (true) {
            try {
                sleep(checkpointTermInSecs * 1000);
            } catch (InterruptedException e) {
                //ignore
            }

            currentMinMCTFirstLSN = getMinMCTFirstLSN();
            if (currentMinMCTFirstLSN - lastMinMCTFirstLSN > lsnThreshold) {
                try {
                    recoveryMgr.checkpoint(false);
                    lastMinMCTFirstLSN = currentMinMCTFirstLSN;
                } catch (ACIDException e) {
                    throw new Error("failed to checkpoint", e);
                }
            }
        }
    }

    private long getMinMCTFirstLSN() {
        List<IIndex> openIndexList = indexLifecycleManager.getOpenIndexes();
        long minMCTFirstLSN = Long.MAX_VALUE;
        long firstLSN;
        if (openIndexList.size() > 0) {
            for (IIndex index : openIndexList) {
                firstLSN = ((BaseOperationTracker) ((ILSMIndex) index).getOperationTracker()).getFirstLSN();
                minMCTFirstLSN = Math.min(minMCTFirstLSN, firstLSN);
            }
        } else {
            minMCTFirstLSN = -1;
        }
        return minMCTFirstLSN;
    }
}