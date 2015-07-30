"use strict";

var account = require( '../models/account-model' ),
    auth = require( 'basic-auth' ),
    express = require( 'express' ),
    router = express.Router(),
    debug = require( 'debug' )( 'account-controller' );

module.exports = function( app ) {
    app.use( '/accounts/api/v1', router );
};

router
    .all( '*', function( req, res, next ) {
        // set content-type to json to provide appropriate json Error responses
        res.set( 'Content-Type', 'application/json' );
        next();
    } )
    .all( '*', authCheck )
    .get( '/account', getExistingAccount )
    .post( '/account', getNewOrExistingAccount )
    .put( '/account', updateExistingAccount )
    .delete( '/account', removeAccount )
    .get( '/list', getList )
    .post( '/list', getList )
    .all( '*', function( req, res, next ) {
        var error = new Error( 'Not allowed' );
        error.status = 405;
        next( error );
    } );

function authCheck( req, res, next ) {
    // check authentication and account
    var error,
        creds = auth( req ),
        key = ( creds ) ? creds.name : undefined;

    if ( !key || ( key !== req.app.get( 'account manager api key' ) ) ) {
        error = new Error( 'Not Allowed. Invalid API key.' );
        error.status = 401;
        res
            .status( error.status )
            .set( 'WWW-Authenticate', 'Basic realm="Enter valid API key as user name"' );
        next( error );
    } else {
        next();
    }
}

function getExistingAccount( req, res, next ) {
    return account.get( {
            openRosaServer: req.param( 'server_url' ),
            key: req.param( 'api_key' )
        } )
        .then( function( account ) {
            _render( 200, account, res );
        } )
        .catch( next );
}

function getNewOrExistingAccount( req, res, next ) {
    return account.set( {
            openRosaServer: req.param( 'server_url' ),
            key: req.param( 'api_key' )
        } )
        .then( function( account ) {
            _render( account.status || 201, account, res );
        } )
        .catch( next );
}

function updateExistingAccount( req, res, next ) {
    return account.update( {
            openRosaServer: req.param( 'server_url' ),
            key: req.param( 'api_key' )
        } )
        .then( function( account ) {
            _render( account.status || 201, account, res );
        } )
        .catch( next );
}

function removeAccount( req, res, next ) {
    return account.remove( {
            openRosaServer: req.param( 'server_url' ),
            key: req.param( 'api_key' )
        } ).then( function( account ) {
            _render( 204, null, res );
        } )
        .catch( next );
}

function getList( req, res, next ) {
    return account.getList()
        .then( function( list ) {
            _render( 200, list, res );
        } )
        .catch( next );
}

function _render( status, body, res ) {
    if ( status === 204 ) {
        // send 204 response without a body
        res.send( status );
    } else {
        body = body || {};
        if ( typeof body === 'string' ) {
            body = {
                message: body
            };
        } else if ( Array.isArray( body ) ) {
            body = body.map( function( account ) {
                return _renameProps( account );
            } );
        } else if ( typeof body === 'object' ) {
            body = _renameProps( body );
        }
        body.code = status;
        res.json( status, body );
    }
}

function _renameProps( account ) {
    return {
        server_url: account.openRosaServer,
        api_key: account.key
    };
}
