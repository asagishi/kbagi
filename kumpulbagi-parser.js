#!/usr/bin/env node

process.chdir( process.cwd() );

var args = {
	start	: 1,
	end		: 10000,
	pages	: undefined,
	output	: undefined
};
process.argv.forEach(function (val, index, array) {
	if( String( val ).match( '--' ) && String( val ).match( '=' ) ){
		val = val.trim().split('=');
		if( val.length > 0 ) {
			if( String( val[0] ).toLowerCase() == '--url' ) {
				args[ 'pages' ] = String( val[1] ).trim();
			}else if( String( val[0] ).toLowerCase() == '--output' ) {
				args[ 'output' ] = String( val[1] ).trim();
			}else if( String( val[0] ).toLowerCase() == '--start' ) {
				args[ 'start' ] = ( parseInt( String( val[1] ).trim() ) > 0 ? parseInt( String( val[1] ).trim() ) : args[ 'start' ] );
			}else if( String( val[0] ).toLowerCase() == '--end' ) {
				args[ 'end' ] = ( parseInt( String( val[1] ).trim() ) > 0 ? parseInt( String( val[1] ).trim() ) : args[ 'end' ] );
			};
		};
	};
});

if( args['pages'] == undefined || args['output'] == undefined ) {
	console.log( 'Parameter --url atau --output tidak ditemukan!' );
	process.exit(1);
};

if( args[ 'pages' ].match('kumpulbagi.com') || args[ 'pages' ].match('kumpulbagi.id') ){
	var tmpurl  = args[ 'pages' ].split('/');
	tmpurl.forEach(function( valu ){
		if( valu.match( 'list,' ) || valu.match( 'gallery,' ) ){
			args[ 'pages' ] = args[ 'pages' ].replace( valu, 'list,'+args['start']+',' + args['end'] );
		};
	});
	args[ 'pages' ] = ( args[ 'pages' ].replace( 'list,'+args['start']+',' + args['end'], '' ) ) + '/list,'+args['start']+',' + args['end'];
	args[ 'pages' ] = String( args[ 'pages' ] ).replace(/([^:]\/)\/+/g, "$1");
	if ( !/^(?:f|ht)tps?\:\/\//.test( args[ 'pages' ] ) ) {
        args[ 'pages' ] = "http://" + args[ 'pages' ];
    };
};

var result = [],
	filesys = require('fs'),
	request = require('request'),
	envrmnt = require('jsdom').env,
	urlpars = require( 'url' ),
	hostnme = urlpars.parse( args['pages'] ).hostname,
	protocl = urlpars.parse( args['pages'] ).protocol;

console.info( 'Mengambil halaman dari ', hostnme );
console.info( args[ 'pages' ] );
var uniqURL = function ( a ) {
    return a.sort().filter(function(item, pos, ary) {
        return !pos || item != ary[pos - 1];
    });
};
var doDirect = function( index, temptk ){
	if( index < temptk.length ){
		var v = temptk[ index ];
		console.info( protocl + '//' + hostnme + v['action'] );
		request.post({
			url: protocl + '//' + hostnme + v['action'],
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			form: {
				fileId : v['fileid'],
				__RequestVerificationToken : v['tokens']
			}
		}, function( err, httpResponse, body ){
			if( err ){
				console.error( 'gagal mengambil salah satu direct link', 'index ke ', index );
			}else{
				//console.log(body)
				result.push( JSON.parse( body ) );
				doDirect( ( index + 1 ), temptk );
			};
		});
	}else{
		if( temptk.length == result.length ){
			filesys.writeFileSync( args['output'] + '.json', JSON.stringify( result ) );
			
			var directlink = [];
			result.forEach(function( v ){
				directlink.push( v['DownloadUrl'] );
			});
			directlink = uniqURL( directlink );
			filesys.writeFileSync( args['output'] + '.txt', directlink.join('\n') );
			console.log('Parsing selesai!')
		}else{
			console.log( 'Hasil direct link tidak sama dengan data yang sebelumnya, kemungkinan terjadi kegagalan ketika mengambil.' );
		};
	};
};
request( args['pages'], function ( error, response, body ) {
	if (!error && response.statusCode == 200) {
		envrmnt( body, function ( errors, window ) {
			if( !errors ){
				console.info( 'Mencoba melakukan parsing halaman..' )
				var $ = require( 'jquery' )( window ),
					temptk = [];
				$('.list_row[data-file-id]').each(function(){
					var action = $(this).find('form').attr('action'),
						fileid = $(this).find('form').find('input[name="fileId"]').val(),
						tokens = $(this).find('form').find('input[name="__RequestVerificationToken"]').val();
					temptk.push({
						action : action,
						fileid : fileid,
						tokens : tokens
					});
				});
				console.info( 'Mencoba mengambil direct link' )
				doDirect( 0, temptk );
			}else{
				console.error( 'Gagal melakukan parser #1' );
			};
	  });
	}else{
		console.error( 'Gagal melakukan parser #0' );
	};
});