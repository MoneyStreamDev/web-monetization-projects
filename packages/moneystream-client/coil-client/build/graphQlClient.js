"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQlClient = exports.GraphQlClientOptions = void 0;
var annotations_1 = require("@dier-makr/annotations");
var portableFetch_1 = require("./utils/portableFetch");
var queries_1 = require("./queries");
var GraphQlClientOptions = (function () {
    function GraphQlClientOptions() {
        this.moneystreamDomain = 'https://moneystream.com';
        this.fetch = portableFetch_1.portableFetch;
    }
    GraphQlClientOptions = __decorate([
        annotations_1.injectable()
    ], GraphQlClientOptions);
    return GraphQlClientOptions;
}());
exports.GraphQlClientOptions = GraphQlClientOptions;
var GraphQlClient = (function () {
    function GraphQlClient(config) {
        if (config === void 0) { config = new GraphQlClientOptions(); }
        this.config = config;
        this.login = queries_1.login;
        this.refreshBtpToken = queries_1.refreshBtpToken;
        this.queryToken = queries_1.queryToken;
        this.whoAmI = queries_1.whoAmI;
        this.fetch = this.config.fetch;
    }
    GraphQlClient.prototype.query = function (_a) {
        var query = _a.query, _b = _a.token, token = _b === void 0 ? null : _b, _c = _a.variables, variables = _c === void 0 ? {} : _c;
        return __awaiter(this, void 0, void 0, function () {
            var init, res;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        init = {
                            method: 'POST',
                            headers: {
                                Accept: 'application/json',
                                'Content-Type': 'application/json',
                                Authorization: token ? "Bearer " + token : ''
                            },
                            body: JSON.stringify({ query: query, variables: variables })
                        };
                        if (this.config.log) {
                            this.config.log('Domain:', this.config.moneystreamDomain, 'Url:', JSON.stringify(__assign(__assign({}, init), { body: { query: query, variables: variables } }), null, 2));
                        }
                        return [4, this.fetch(this.config.moneystreamDomain + "/graphql", init)];
                    case 1:
                        res = _d.sent();
                        if (!res.ok) {
                            throw new Error("graphql query failed. status=" + res.status + " query=`" + query + "`");
                        }
                        return [4, res.json()];
                    case 2: return [2, (_d.sent())];
                }
            });
        });
    };
    GraphQlClient.Options = GraphQlClientOptions;
    GraphQlClient = __decorate([
        annotations_1.injectable(),
        __param(0, annotations_1.inject(GraphQlClientOptions)),
        __metadata("design:paramtypes", [GraphQlClientOptions])
    ], GraphQlClient);
    return GraphQlClient;
}());
exports.GraphQlClient = GraphQlClient;
//# sourceMappingURL=graphQlClient.js.map
