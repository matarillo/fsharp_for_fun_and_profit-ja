---
layout: series_index
title: "「循環依存」シリーズ"
seriesIndexId: "循環依存"
---

F#に関してよく聞かれる不満の一つに、コードを「依存順」で書く必要があるという点があります。つまり、コンパイラがまだ認識していないコードへの前方参照を使うことができません。

このシリーズでは、循環依存について議論し、なぜそれが悪いのか、そしてどのように取り除くかを説明します。


* [循環依存は悪](../posts/cyclic-dependencies.md)。循環依存：パート1
* [循環依存を取り除くリファクタリング](../posts/removing-cyclic-dependencies.md)。循環依存：パート2
* [実世界の循環依存とモジュール性](../posts/cycles-and-modularity-in-the-wild.md)。C#とF#で実プロジェクトの指標を比較
