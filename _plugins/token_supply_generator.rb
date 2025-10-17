module Jekyll
  class TokenSupplyGenerator < Generator
    safe true
    priority :high

    def generate(site)
      # Fetch token supply data
      circulating_supply = fetch_circulating_supply
      total_supply = fetch_total_supply

      # Check if data has changed before updating
      data_file = File.join(site.source, '_data', 'token_supply.yml')
      yaml_content = "circulating_supply: \"#{circulating_supply}\"\ntotal_supply: \"#{total_supply}\""
      
      # Only update if content has changed
      if !File.exist?(data_file) || File.read(data_file) != yaml_content
        File.write(data_file, yaml_content)
        puts "✅ Updated token supply data:"
        puts "   Circulating Supply: #{circulating_supply}"
        puts "   Total Supply: #{total_supply}"
      else
        puts "ℹ️  Token supply data unchanged, skipping update"
        puts "   Current: Circulating=#{circulating_supply}, Total=#{total_supply}"
      end
    end

    private

    def fetch_circulating_supply
      # Return as float with 18 decimals (187834.000000000000000000)
      "229450.590000000000000000"

      # Adding other non locked wallets (despite managed): 229,450.59
      #  This includes the previous 187,834, the liquidity management pool, corp multisig, and foundation multisig
      # Epoch 678 + 2930 on 2025-10-15 + 45103.5 vestings = 187,834 -->
      # Epoch 677 + 3443 on 2025-09-15 = 139,800.5 -->
      # Epoch 676 + 2956.5 on 2025-08-18 = 136,357.5 -->
      # Epoch 675 + 3,009 on 2025-07-16 = 133,401 -->
      # Updating fine grained calcs on 2025-06-25 = 130,392 -->
      # Epoch 674 + 2,931.5 on 2025-06-25 = 108,705.5 -->
      # Start @ 105,774 -->

    end

    def fetch_total_supply
      require 'net/http'
      require 'json'
      require 'uri'

      begin
        # RPC call to Moonbeam Network
        uri = URI('https://rpc.api.moonbeam.network')
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true

        request = Net::HTTP::Post.new(uri)
        request['Content-Type'] = 'application/json'
        
        payload = {
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [
            {
              to: "0x434116a99619f2B465A137199C38c1Aab0353913",
              data: "0x18160ddd"  # totalSupply() selector
            },
            "latest"
          ]
        }
        
        request.body = payload.to_json
        response = http.request(request)
        
        if response.code == '200'
          result = JSON.parse(response.body)
          if result['result']
            # Convert from wei to tokens (divide by 10^18)
            total_supply_wei = result['result'].to_i(16)
            total_supply_tokens = total_supply_wei.to_f / (10 ** 18)
            # Format to exactly 18 decimal places, preserving blockchain precision
            formatted = sprintf("%.18f", total_supply_tokens)
            # Ensure exactly 18 decimal places by padding with zeros if needed
            parts = formatted.split('.')
            if parts.length == 2
              decimal_part = parts[1].ljust(18, '0')[0, 18]
              return "#{parts[0]}.#{decimal_part}"
            else
              return formatted + ".000000000000000000"
            end
          end
        end
        
        # Fallback value if RPC call fails
        "10404696.000000000000000000"
      rescue => e
        puts "Warning: Failed to fetch total supply: #{e.message}"
        "10404696.000000000000000000"
      end
    end
  end
end
