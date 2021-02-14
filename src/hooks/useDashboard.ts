import useTreasury from "hooks/useTreasury";
import useYam from "hooks/useYam";
import { useWallet } from "use-wallet";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "react-neu";

import { SeriesInterface, TimeSeries } from "types/Charts";

import {
  treasuryEvents,
  getCurrentBlock,
  getIndexCoopLPRewards,
  getSushiRewards,
  getValue,
  getYam
} from "yam-sdk/utils";
import numeral from "numeral";

const useDahsboard = () => {
  const yam = useYam();
  const [treasuryValues, setTreasuryValues] = useState<any>();
  const [seriesReserves, setSeriesReserves] = useState<SeriesInterface[]>();
  const [assetsData, setAssetsData] = useState<Object[]>();
  const [assetsColors, setAssetsColors] = useState<any>();
  const [yamObject, setYamObject] = useState<Object>();

  const { darkMode, colors } = useTheme();
  const { totalYUsdValue, totalWETHValue, totalDPIValue, totalUMAValue, totalBalanceIndexCoop, getAssetsHistory } = useTreasury();

  const { status } = useWallet();
  const defaultRange = 14;

  function hasKey<O>(obj: O, key: keyof any): key is keyof O {
    return key in obj
  }

  const fetchTreasury = useCallback(async () => {
    if (!yam) {
      return;
    }
    const { reservesAdded, yamsSold, yamsFromReserves, yamsToReserves, blockNumbers, blockTimes } = await treasuryEvents(yam);
    setTreasuryValues({
      reservesAdded,
      yamsSold,
      yamsFromReserves,
      yamsToReserves,
      blockNumbers,
      blockTimes,
    });
  }, [yam, setTreasuryValues]);

  useEffect(() => {
    if (status !== "connected" || !yam || !treasuryValues) {
      return;
    }
    fetchReserves();
  }, [darkMode, status, yam, treasuryValues]);

  const fetchReserves = useCallback(async () => {
    if (!yam || !totalDPIValue || !treasuryValues) {
      return;
    }
    if (!totalYUsdValue || !totalWETHValue || !totalDPIValue) {
      return;
    }

    const assetsHistory = await getAssetsHistory();
    console.log("useDashboard", assetsHistory);
    const currentBlock = (await getCurrentBlock(yam)).number;

    const wethValues = await getValue("weth");
    const dpiValues = await getValue("defipulse-index");
    const umaValues = await getValue("uma");
    const yusdValues = await getValue("yvault-lp-ycurve");
    const sushiValues = await getValue("sushi");
    const indexCoopValues = await getValue("index-cooperative");
    const yamValues = await getYam();

    const wethPrice = wethValues.market_data.current_price.usd;
    const yusdPrice = yusdValues.market_data.current_price.usd;
    const dpiPrice = dpiValues.market_data.current_price.usd;
    const indexPrice = indexCoopValues.market_data.current_price.usd;
    const sushiPrice = sushiValues.market_data.current_price.usd;
    const umaPrice = umaValues.market_data.current_price.usd;

    const DPIBalance = totalDPIValue;
    // const indexCoopLP = await getIndexCoopLP(yam);
    const indexCoopLPRewards = (await getIndexCoopLPRewards(yam)) || 0;
    const SushiRewards = (await getSushiRewards(yam)) || 0;

    const change24WETH = numeral(wethValues?.market_data.price_change_percentage_24h_in_currency.usd).format("0.00a") + "%";
    const change24DPI = numeral(dpiValues?.market_data.price_change_percentage_24h_in_currency.usd).format("0.00a") + "%";
    const change24UMA = numeral(umaValues?.market_data.price_change_percentage_24h_in_currency.usd).format("0.00a") + "%";
    const change24YUSD = numeral(yusdValues?.market_data.price_change_percentage_24h_in_currency.usd).format("0.00a") + "%";
    const change24IndexCoop = numeral(indexCoopValues?.market_data.price_change_percentage_24h_in_currency.usd).format("0.00a") + "%";
    const change24Sushi = numeral(sushiValues?.market_data.price_change_percentage_24h_in_currency.usd).format("0.00a") + "%";

    const reservesHistory = [];
    const assetsColors = [];

    for (let blockNumber in assetsHistory.WETH) {
      if (blockNumber === 'color') {
        for (let assetKey in assetsHistory) {
          if (hasKey(assetsHistory, assetKey)) {
            assetsColors.push(assetsHistory[assetKey]['color']);
          }
        }
      } else {
        const historyObject: {[K: string]: any} = {
          info: blockNumber !== 'latest' ? ("Block " + blockNumber) : "present",
          block: blockNumber !== 'latest' ? blockNumber : currentBlock + 5000,
        };
        for (let assetKey in assetsHistory) {
          if (hasKey(assetsHistory, assetKey)) {
            if (hasKey(assetsHistory[assetKey], blockNumber)) {
              const value:any = assetsHistory[assetKey][blockNumber];
              historyObject[assetKey] = blockNumber !== 'latest' ? value.value : value;
            } else {
              historyObject[assetKey] = 0;
            }
          }
        }
        reservesHistory.push(historyObject);
      }
    }


    let now = Math.floor(Date.now() / 1000);
    let reserves: TimeSeries[] = [];
    let reservesDPI: TimeSeries[] = [];
    let reservesETH: TimeSeries[] = [];
    let reservesINDEXLP: TimeSeries[] = [];
    let reservesINDEX: TimeSeries[] = [];
    let reservesUMA: TimeSeries[] = [];
    let reservesSushi: TimeSeries[] = [];
    let running = 0;
    for (let i = 0; i < treasuryValues.reservesAdded.length; i++) {
      running += treasuryValues.reservesAdded[i];
      // if (treasuryValues.blockNumbers[i] > 10946646) { // live remove (only for reserves)
      //   const tmp: TimeSeries = {
      //     // x: treasuryValues.blockNumbers[i],
      //     x: treasuryValues.blockTimes[i],
      //     y: totalYUsdValue * yUSDRate, // get pastEvents on blocknumber 11133885 (1603739830) for yUSD in reserve
      //   };
      //   reserves.push(tmp);
      // } else {
      // }
      if (
        treasuryValues.blockNumbers[i] <= 11133885
        // && treasuryValues.blockNumbers[i] >= currentBlock
      ) {
        const tmp: TimeSeries = {
          x: treasuryValues.blockNumbers[i],
          y: running * yusdPrice,
        };
        reserves.push(tmp);

        const tmpDPI: TimeSeries = {
          x: treasuryValues.blockNumbers[i],
          y: 0,
        };
        reservesDPI.push(tmpDPI);

        const tmpETH: TimeSeries = {
          x: treasuryValues.blockNumbers[i],
          y: 0,
        };
        reservesETH.push(tmpETH);

        const tmpINDEXLP: TimeSeries = {
          x: treasuryValues.blockNumbers[i],
          y: 0,
        };
        reservesINDEXLP.push(tmpINDEXLP);

        const tmpINDEX: TimeSeries = {
          x: treasuryValues.blockNumbers[i],
          y: 0,
        };
        reservesINDEX.push(tmpINDEX);

        const tmpXSushi: TimeSeries = {
          x: treasuryValues.blockNumbers[i],
          y: 0,
        };
        reservesSushi.push(tmpXSushi);

        const tmpUMA: TimeSeries = {
          x: treasuryValues.blockNumbers[i],
          y: 0,
        };
        reservesUMA.push(tmpUMA);
      }
    }

    for (let i = 0; i < reservesHistory.length; i++) {
      reserves.push({
        x: reservesHistory[i].block,
        y: reservesHistory[i].yUSD,
      });
      reservesDPI.push({
        x: reservesHistory[i].block,
        y: reservesHistory[i].DPI,
      });
      reservesETH.push({
        x: reservesHistory[i].block,
        y: reservesHistory[i].WETH,
      });
      reservesINDEXLP.push({
        x: reservesHistory[i].block,
        y: reservesHistory[i].INDEXLP,
      });
      reservesINDEX.push({
        x: reservesHistory[i].block,
        y: reservesHistory[i].INDEX,
      });
      reservesSushi.push({
        x: reservesHistory[i].block,
        y: reservesHistory[i].Sushi,
      });
      reservesUMA.push({
        x: reservesHistory[i].block,
        y: reservesHistory[i].UMA,
      });
    }

    const series: SeriesInterface[] = [
      {
        name: "yUSD Reserves",
        data: reserves ? reserves.slice(reserves.length - (defaultRange + 6)) : [],
      },
      {
        name: "DPI Reserves",
        data: reservesDPI ? reservesDPI.slice(reservesDPI.length - (defaultRange + 6)) : [],
      },
      {
        name: "ETH Reserves",
        data: reservesETH ? reservesETH.slice(reservesETH.length - (defaultRange + 6)) : [],
      },
      {
        name: "Sushi Gains",
        data: reservesSushi ? reservesSushi.slice(reservesSushi.length - (defaultRange + 6)) : [],
      },
      {
        name: "INDEX Coop LP",
        data: reservesINDEXLP ? reservesINDEXLP.slice(reservesINDEXLP.length - (defaultRange + 6)) : [],
      },
      {
        name: "INDEX Coop Gains",
        data: reservesINDEX ? reservesINDEX.slice(reservesINDEX.length - (defaultRange + 6)) : [],
      },
      {
        name: "UMA Voting Token",
        data: reservesUMA ? reservesUMA.slice(reservesUMA.length - (defaultRange + 6)) : [],
      },
    ];

    const assets: Object[] = [
      {
        icon: wethValues?.image.large,
        name: "Wrapped Ether",
        index: "WETH",
        quantity: numeral(totalWETHValue).format("0,0.00"),
        price: "$" + numeral(wethPrice).format("0,0.00"),
        change: change24WETH ? change24WETH : "0.00%",
        value: "$" + numeral(assetsHistory.WETH.latest).format("0,0.00"),
        number: assetsHistory.WETH.latest,
      },
      {
        icon: sushiValues?.image.large,
        name: "Sush Gains",
        index: "SUSHI",
        quantity: numeral(SushiRewards).format("0,0.00"),
        price: "$" + numeral(sushiPrice).format("0,0.00"),
        change: change24Sushi ? change24Sushi : "0.00%",
        value: "$" + numeral(assetsHistory.Sushi.latest).format("0,0.00"),
        number: assetsHistory.Sushi.latest,
      },
      {
        icon: yusdValues?.image.large,
        name: "yearn Curve",
        index: "yyDAI+",
        quantity: numeral(totalYUsdValue).format("0,0.00"),
        price: "$" + numeral(yusdPrice).format("0,0.00"),
        change: change24YUSD ? change24YUSD : "0.00%",
        value: "$" + numeral(assetsHistory.yUSD.latest).format("0,0.00"),
        number: assetsHistory.yUSD.latest,
      },
      {
        icon: dpiValues?.image.large,
        name: "DefiPulse Index",
        index: "DPI",
        quantity: numeral(DPIBalance).format("0,0.00"),
        price: "$" + numeral(dpiPrice).format("0,0.00"),
        change: change24DPI ? change24DPI : "0.00%",
        value: "$" + numeral(assetsHistory.DPI.latest).format("0,0.00"),
        number: assetsHistory.DPI.latest,
      },
      {
        icon: indexCoopValues?.image.large,
        name: "Index Coop Gains",
        index: "INDEX",
        quantity: numeral(totalBalanceIndexCoop).format("0,0.00"),
        price: "$" + numeral(indexPrice).format("0,0.00"),
        change: change24IndexCoop ? change24IndexCoop : "0.00%",
        value: "$" + numeral(assetsHistory.INDEX.latest).format("0,0.00"),
        number: assetsHistory.INDEX.latest,
      },
      {
        icon: indexCoopValues?.image.large,
        name: "Index Coop LP",
        index: "INDEXLP",
        quantity: numeral(indexCoopLPRewards).format("0,0.00"),
        price: "$" + numeral(indexPrice).format("0,0.00"),
        change: change24IndexCoop ? change24IndexCoop : "0.00%",
        value: "$" + numeral(assetsHistory.INDEXLP.latest).format("0,0.00"),
        number: assetsHistory.INDEXLP.latest,
      },
      {
        icon: umaValues?.image.large,
        name: "UMA Voting Token",
        index: "UMA",
        quantity: numeral(totalUMAValue).format("0,0.00"),
        price: "$" + numeral(umaPrice).format("0,0.00"),
        change: change24UMA ? change24UMA : "0.00%",
        value: "$" + numeral(assetsHistory.UMA.latest).format("0,0.00"),
        number: assetsHistory.UMA.latest,
      },
    ];

    setSeriesReserves(series);
    setAssetsData(assets);
    setAssetsColors(assetsColors);
    let treasuryAssets = 0;
    assets.forEach((asset:any) => {
      treasuryAssets += asset.number;
    });
    setYamObject({
      currentPrice: numeral(yamValues?.market_data.current_price.usd).format("0.00a"),
      maxSupply: numeral(yamValues?.market_data.max_supply).format("0.00a"),
      marketCap: numeral(yamValues?.market_data.market_cap.usd).format("0.00a"),
      treasuryValue: typeof totalYUsdValue !== "undefined" && totalYUsdValue !== 0 ? "~$" + numeral(treasuryAssets).format("0.00a") : "--",
      change24: numeral(yamValues?.market_data.price_change_percentage_24h_in_currency.usd).format("0.00a") + "%"
    });
  }, [darkMode, status, yam, totalDPIValue, treasuryValues]);

  useEffect(() => {
    fetchTreasury();
    let refreshInterval = setInterval(() => fetchTreasury(), 300000);
    // console.log("treasuryValues", treasuryValues);
    return () => clearInterval(refreshInterval);
  }, [fetchTreasury]);

  return {
    assetsData,
    seriesReserves,
    yamObject,
    assetsColors
  };

};

export default useDahsboard;
