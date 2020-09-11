
/*
 * 一覧画面に地図を表示するサンプルプログラム
 * Copyright (c) 2013 Cybozu
 *
 * Licensed under the MIT License
 */

(function() {

    "use strict";

    // API キー
    var api_key = 'AIzaSyBBbsU42u4vWII-pEsJCx8hnxAH9nV2Fb4';

    // ヘッダに要素を追加します
    function load(src) {
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        head.appendChild(script);
    }

    // 緯度、経度を空にします
    function emptyLatLng(event) {

        // event よりレコード情報を取得します
        var rec = event['record'];

        // 保存の際に緯度、経度を空にします
        rec['lat']['value'] = '';
        rec['lng']['value'] = '';
        return event;

    }

    // Google Map を Load します
    function loadGMap() {

        // document.write を定義します
        var nativeWrite = document.write;
        document.write = function(html) {
            var m = html.match(/script.+src="([^"]+)"/);
            if (m) { load(m[1]);} else { nativeWrite(html); }
        };

        // Google Map の API ライブラリをロードします
        load('https://maps.googleapis.com/maps/api/js?v=3&key=' + api_key);
        // load('https://maps.googleapis.com/maps/api/directions/json?origin=place_id:ChIJU49AUZLCj18RLQ-0Ko9_Wzw&destination=place_id:ChIJpYqBc3LBj18RO4KG0H4W_Cgplace_id:ChIJU49AUZLCj18RLQ-0Ko9_Wzw&destination=place_id:ChIJpYqBc3LBj18RO4KG0H4W_Cg&key=' + api_key);

    }

    // 地図を「住所」フィールドの下に表示します
    // 緯度・経度がない場合は、住所をもとに緯度・経度を算出し、
    // フィールドに値を入れた後、レコードを更新します
    function setLocationDetail(event) {

        // レコード情報を取得します
        var rec = event['record'];

        // Google Geocoder を定義します
        var gc = new google.maps.Geocoder();

        // 住所が入力されていなければ、ここで処理を終了します
        if (rec['住所']['value'] === undefined) {return;}
        if (rec['住所']['value'].length === 0) {return;}

        // 緯度・経度が入力されていなければ、住所から緯度・経度を算出します
        if (rec['lat']['value'] === undefined ||
            rec['lng']['value'] === undefined ||
            rec['lat']['value'].length === 0 ||
            rec['lng']['value'].length === 0) {

            // Geocoding API を実行します
            gc.geocode({
                address: rec['住所']['value'],
                language: 'ja',
                country: 'JP'
            }, function(results, status) {

                // 住所が検索できた場合、開いているレコードに対して
                // 緯度・経度を埋め込んで更新します
                if (status === google.maps.GeocoderStatus.OK) {

                    // 更新するデータの Object を作成します
                    var objParam = {};
                    objParam['app'] = kintone.app.getId();// アプリ番号
                    objParam['id'] = kintone.app.record.getId(); // レコードID
                    objParam['record'] = {};
                    objParam['record']['lat'] = {}; // 緯度
                    objParam['record']['lat']['value'] = results[0].geometry.location.lat();
                    objParam['record']['lng'] = {}; // 経度
                    objParam['record']['lng']['value'] = results[0].geometry.location.lng();

                    // レコードを更新します
                    kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', objParam, function(resp) {
                        // 成功時は画面をリロードします
                        location.reload(true);
                    }, function(resp) {
                        // エラー時はメッセージを表示して、処理を中断します
                        alert('error->' + resp);
                        return;
                    });
                }
            });
        }

        // 地図を表示する div 要素を作成します
        var mapEl_address = document.createElement('div');
        mapEl_address.setAttribute('id', 'map_address');
        mapEl_address.setAttribute('name', 'map_address');
        mapEl_address.setAttribute('style', 'width: 300px; height: 250px');

        // 「Map」スペース内に mapEl_address で設定した要素を追加します
        var elMap = kintone.app.record.getSpaceElement('Map');
        elMap.appendChild(mapEl_address);

        // 「Map」スペースの親要素のサイズを変更します
        var elMapParent = elMap.parentNode;
        elMapParent.setAttribute('style', 'width: 300px; height: 250px');

        // ポイントする座標を指定します
        var point = new google.maps.LatLng(rec['lat']['value'], rec['lng']['value']);

        // 地図の表示の設定(中心の位置、ズームサイズ等)を設定します
        var opts = {
            zoom: 15,
            center: point,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            scaleControl: true
        };

        // 地図を表示する要素を呼び出します
        var map_address = new google.maps.Map(document.getElementById('map_address'), opts);

        // マーカーを設定します
        var marker = new google.maps.Marker({
            position: point,
            map: map_address,
            title: rec['住所']['value']
        });

    }

    // 地図を一覧画面のメニュー下のスペースに表示します
    function setLocationIndex(event) {

        var lat = [];
        var lng = [];
        var recno = [];
        var rec, i;

        // レコード情報を取得します
        rec = event['records'];

        // 一覧に表示されているすべてのレコードの緯度・経度とレコードIDを配列に格納します
        for (i = 0; i < rec.length; i += 1) {
            if (rec[i].lat.value !== undefined && rec[i].lng.value !== undefined) {
                if (rec[i].lat.value.length > 0 && rec[i].lng.value.length > 0) {
                    lat.push(parseFloat(rec[i].lat.value)); // 緯度
                    lng.push(parseFloat(rec[i].lng.value)); // 経度
                    recno.push(parseFloat(rec[i].$id.value)); // レコードID
                }
            }
        }
        
        // 一覧の上部部分にあるスペース部分を定義します
        var elAction = kintone.app.getHeaderSpaceElement();

        // すでに地図要素が存在する場合は、削除します
        // ※ ページ切り替えや一覧のソート順を変更した時などが該当します
        var check = document.getElementsByName('map');
        if (check.length !== 0) {
            elAction.removeChild(check[0]);
        }

        // 地図を表示する要素を定義し、スペース部分の要素に追加します
        var mapEl = document.createElement('div');
        mapEl.setAttribute('id', 'map');
        mapEl.setAttribute('name', 'map');
        mapEl.setAttribute('style', 'width: auto; height: 300px; margin-right: 30px; border: solid 2px #c4b097');
        elAction.appendChild(mapEl);

        // 一覧に表示されているレコードで、緯度・経度の値が入っている
        // 一番上のレコードの緯度・経度を取得します(地図の中心になります)
        var latlng = 0;
        for (i = 0; i < lat.length; i += 1) {
            if (isNaN(lat[i]) === false && isNaN(lng[i]) === false) {
                latlng = new google.maps.LatLng(lat[i], lng[i]);
                break;
            }
        }

        // もし、緯度・経度に値が入っているレコードがなければ、ここで処理を終了します
        if (latlng === 0) { return;}

        // 表示する地図の設定を行います
        var opts = {
            zoom: 12,
            center: latlng,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            scaleControl: true,
            title: 'target'
        };

        // 地図の要素を定義します
        var map = new google.maps.Map(document.getElementById('map'), opts);
        var marker = [];
        var m_latlng = [];

        // 緯度・経度をもとに、地図にポインタを打ち込みます
        // for (i = 0; i < lat.length; i += 1) {
        //     if (isNaN(lat[i]) === false && isNaN(lng[i]) === false) {
        //         m_latlng[i] = new google.maps.LatLng(lat[i], lng[i]);
        //         marker[i] = new google.maps.Marker({
        //             position: m_latlng[i],
        //             map: map,
        //             // ポインタのアイコンは Google Charts を使用します
        //             icon: 'https://chart.googleapis.com/chart?chst=d_bubble_text_small&chld=edge_bc|'
        //             + recno[i] + '|FF8060|000000'
        //         });
        //     }
        // }


        for (i = 0; i < lat.length; i += 1) {
            if (isNaN(lat[i]) === false && isNaN(lng[i]) === false) {
                m_latlng[i] = new google.maps.LatLng(lat[i], lng[i]);
                marker[i] = new google.maps.Marker({
                    position: m_latlng[i],
                    map: map,
                    title: "",
                    // clickable: True,
                    // ポインタのアイコンは Google Charts を使用します
                    icon: 'https://chart.googleapis.com/chart?chst=d_bubble_text_small&chld=edge_bc|'
                    + recno[i] + '|FF8060|000000',
                });
                marker[i].addListener("click", function(e) {
                    console.log(e.latLng.lat());
                    console.log(e.latLng.lng());
                    console.log(e.latLng.toString());
                    document.createElement('div');
                    var ido = e.latLng.lat();
                    var keido = e.latLng.lng();
                    var jusyo  = (ido + ',' + keido);
                    // var jusyo = e.latLng.toString()


                    var genzaiti = navigator.geolocation.getCurrentPosition(function(position) {
                        // var ini = new google.maps.Marker({
                        //         position: new google.maps.LatLng(34.8192768,135.3580544),  //マーカ位置
                        //         map: map,
                        //         title: '現在位置',  //タイトル位置
                        //         draggable:true,  //アイコンの移動の有効無効
                        //         icon: 'http://waox.main.jp/maps/icon/car2.png',//アイコン指定
                        //         animation: google.maps.Animation.DROP
                        // });
                        console.log(position);
                        // alert(my_lat[0] + ',' + my_lng[0]) ;
                        var y = (position.coords.latitude + ',' + position.coords.longitude);
                        



                        window.open(
                            'https://maps.googleapis.com/maps/api/directions/json?origin=' + y + '&destination=' + jusyo + '&key=AIzaSyBBbsU42u4vWII-pEsJCx8hnxAH9nV2Fb4',
                            // null,
                            '_blank' ,
                            'top=100,left=100,width=300,height=300',
                            );
                        
                        alert('現在地：' + y + '\n' + '目的地：' + jusyo);
                    });
                });   
                // marker[i].addListener("click", () => {
                //     alert('アラート表示');
                // });   
            }
        }

        // クリックされた時の処理
        // for (i = 0; i < marker.length; i += 1) {
        //     marker[i].addListener("click", () => {
        //         alert('aaaaaaaaaaaaaaa')
            
            
        //     });
          
        // }

        // Event
        // marker.addListener( "click", function ( argument ) {
        //     console.log( argument ) ;
        // } ) ;


        // var infowindow = new google.maps.InfoWindow();
        // google.maps.event.addListener(marker, "click", (function(marker) {
        //     return function(evt) {
        //       var content = marker.getTitle();
        //       infowindow.setContent(content);
        //       infowindow.open(map, marker);
        //       window.prompt('いま押しましたね？');
        //       alert('aaaaaaaaaaaaaaaa')
        //     }
        // })(marker));


        // GoogleMap.setOnMarkerClickListener(OnMarkerClickListener, 'click', function() {
        //     alert('aaaaaaaaaaaaaa');
        // });



        //クリックしたら指定したurlに遷移するイベント
        // google.maps.event.addListener(marker, 'click', (function(url){
        //     return function(){ alert('aaaaaaaaaaaaaaaaa') };
        // }));




        // google.maps.event.addListener(map, 'click', function() {
        //     alert('aaaaaaaaaaa');
        // });



        // google.maps.event.addListener(
        //     m_latlng, 
        //     "click", 
        //     function (e) {
        //         alert('click');
        //     }
        // );
        // google.maps.event.addListener(
        //     marker, 
        //     "click", 
        //     function (e) {
        //         alert('click');
        //     }
        // );


        // function displayName() { // displayName() は内部に閉じた関数
        //     alert(name); // 親関数で宣言された変数を使用
        // }
        // displayName();
        // 。。。。。。。。。。。。。。。。
        // Event
        // marker.addListener( "click", function ( argument ) {
        //     console.log( argument ) ;
        // } ) ;
        // google.maps.event.addListener(marker, 'click', clickEventFunc);
        
        // clickEventFunc.onclick = function() {
        //     window.confirm('あいうえお');
        // };
        // function clickEventFunc(event) {
        //     window.confirm('aaaaaaaaaaaaaaaaaaaaaaaaa');
        // }

        // ボタン
        var myIndexButton = document.createElement('button');
        myIndexButton.id = 'my_index_button';
        myIndexButton.innerText = '現在地';



        
        // var my_lat = [];
        // var my_lng = [];
        
        // async function aaa() {

        //     await function test() {
        //         navigator.geolocation.getCurrentPosition(test2);
        //     }
        //     // function test() {
        //     //     navigator.geolocation.getCurrentPosition(test2);
        //     // }
            
        //     await function test2(position) {

        //         my_lat[0] = position.coords.latitude;
        //         my_lng[0] = position.coords.longitude;
        //         // alert('緯度：' + IDO + ', 経度：' + KEIDO);
            
        //     }
    

        //     // 34.8192768,135.3580544


        //     alert(my_lat[0] + ',' + my_lng[0]) ;
        //     // console.log(tes);
        //     // console.log(`${my_lat[0]}`);
        //     // console.log(aaa);
        // };
        // myIndexButton.onclick = function() {
        //     aaa();
        // } 
        
        // function test() {
        //     navigator.geolocation.getCurrentPosition(test2);
        // }        
        // function test2(position) {

        //     my_lat[0] = position.coords.latitude;
        //     my_lng[0] = position.coords.longitude;
        //     // alert('緯度：' + IDO + ', 経度：' + KEIDO);
        
        // }

        myIndexButton.onclick = function() {
            // await test();
            // alert(my_lat[0] + ',' + my_lng[0]) ;
            // console.log(`${my_lat[0]}`);
            

            navigator.geolocation.getCurrentPosition(function(position) {
                // var ini = new google.maps.Marker({
                //         position: new google.maps.LatLng(34.8192768,135.3580544),  //マーカ位置
                //         map: map,
                //         title: '現在位置',  //タイトル位置
                //         draggable:true,  //アイコンの移動の有効無効
                //         icon: 'http://waox.main.jp/maps/icon/car2.png',//アイコン指定
                //         animation: google.maps.Animation.DROP
                // });
                console.log(position);
            // alert(my_lat[0] + ',' + my_lng[0]) ;
            alert('現在地：'　+ position.coords.latitude + ',' + position.coords.longitude ) ;

            });
        };



        // メニューの右側の空白部分にボタンを設置
        kintone.app.getHeaderMenuSpaceElement().appendChild(myIndexButton);

    }

    // Google Map がロードされるまで待機します
    function waitLoaded(event, mode, timeout, interval) {
        setTimeout(function() {
            var setTimeout = timeout - interval;
            if ((typeof google !== 'undefined')
                && (typeof google.maps !== 'undefined')
                && (typeof google.maps.version !== 'undefined')) {

                if (mode === 'detail') { // 詳細画面の場合
                    setLocationDetail(event);
                } else if (mode === 'index') { // 一覧画面の場合
                    setLocationIndex(event);
                }
            } else if (setTimeout > 0) { // ロードされるまで繰り返します
                waitLoaded(event, mode, setTimeout, interval);
            }
        }, interval);
    }

    // 詳細画面を開いた時に実行します
    function detailShow(event) {
        loadGMap();
        waitLoaded(event, 'detail', 10000, 100);
    }

    // 一覧画面を開いた時に実行します
    function indexShow(event) {
        loadGMap();
        waitLoaded(event, 'index', 10000, 100);
    }

    // 一覧画面で編集モードになった時に実行されます
    function indexEditShow(event) {
        var record = event.record;
        // 住所フィールドを使用不可にします
        record['住所']['disabled'] = true;
        return event;
    }


    // function geoFindMe() {

    //     const status = document.querySelector('#status');
    //     const mapLink = document.querySelector('#map-link');
      
    //     mapLink.href = '';
    //     mapLink.textContent = '';
      
    //     function success(position) {
    //       const latitude  = position.coords.latitude;
    //       const longitude = position.coords.longitude;
      
    //       status.textContent = '';
    //       mapLink.href = `https://www.openstreetmap.org/#map=18/${latitude}/${longitude}`;
    //       mapLink.textContent = `Latitude: ${latitude} °, Longitude: ${longitude} °`;
    //     }
      
    //     function error() {
    //       status.textContent = 'Unable to retrieve your location';
    //     }
      
    //     if(!navigator.geolocation) {
    //       status.textContent = 'Geolocation is not supported by your browser';
    //     } else {
    //       status.textContent = 'Locating…';
    //       navigator.geolocation.getCurrentPosition(success, error);
    //     }
      
    //   }
      
    //   document.querySelector('#find-me').addEventListener('click', geoFindMe);



    // 登録・更新イベント(新規レコード、編集レコード、一覧上の編集レコード)
    kintone.events.on(['app.record.create.submit',
        'app.record.edit.submit',
        'app.record.index.edit.submit'], emptyLatLng);

    // 詳細画面が開いた時のイベント
    kintone.events.on('app.record.detail.show', detailShow);

    // 一覧画面が開いた時のイベント
    kintone.events.on('app.record.index.show', indexShow);

    // 一覧画面で編集モードにした時のイベント
    kintone.events.on('app.record.index.edit.show', indexEditShow);

})();
