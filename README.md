*For an English explanation of this project, [click here](https://rdghosal.github.io/portfolio/reflections#searchBar).*

searchBar.js
===
```
Author: Rahul D. GHOSAL
Date: 2020年1月2日
```
## 1. 目的
特にローマ字の文字列において、「アプリ内検索」の制限を緩和して
レコードデータを検索できる検索ボックスをレンダーする。

## 2. 説明
### 1. 設定
kintoneのアプリ設定において、`searchBar.js`を設定する。
### 2. 使用方法
1. 検索ボックスがアプリ画面（全レコード表示）での読み込みが終了したら、使用可能となる。
2. 対象フィールドを選択、クエリを入力してから、`Enter`キーを押すあるいは「検索」ボタンをクリック。
3. ヒットされたレコードが**別タブの表**として纏められる。各行kintoneによる検索結果URLが記載されており、URLをクリックすることでレコード詳細にアクセスできる。

## 3. TODO
1. 検索結果を別タブではなく、モーダルウィンドウとして表示するようにコードを編集。
